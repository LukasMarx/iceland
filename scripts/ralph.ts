#!/usr/bin/env node
// scripts/ralph.ts
//
// Ralph loop — autonomous AFK agent driver for opencode.
// Reads `ready-for-agent` GitHub issues, picks one per iteration,
// invokes `opencode run --agent ralph` against it, gates the result
// with full-scope lint+test+build, and opens a PR per issue.
//
// Usage:
//   npx tsx scripts/ralph.ts run [--max-iterations 10] [--max-minutes N] [--model <m>] [--dry-run]
//   npx tsx scripts/ralph.ts list
//   npx tsx scripts/ralph.ts reset <N>
//
// See .opencode/agent/ralph.md for the agent's system prompt.

import { spawnSync } from 'node:child_process';
import simpleGit, { SimpleGit } from 'simple-git';
import { parseArgs } from 'node:util';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ─── Constants from the grilling session ──────────────────────────────────

const RALPH_AGENT = 'ralph';
const DEFAULT_MODEL = 'opencode-go/qwen3.7-plus';
const DEFAULT_MAX_ITERATIONS = 10;
const MAX_ATTEMPTS_PER_ISSUE = 2; // K=2
const BRANCH_PREFIX = 'agent/issue-';
const READY_LABEL = 'ready-for-agent';
const REVIEW_LABEL = 'ready-for-human';
const FULL_GATE_PROJECTS =
  'mobile,admin,api,domain,api-contracts,map,i18n,ui,mobile-e2e,api-e2e';
const BASE_BRANCH = 'main';

const stopReasonMessages: Record<string, string> = {
  S1: 'Done — no ready-for-agent issues remain.',
  S2: 'Waiting on review — all remaining issues are blocked by unmerged PRs.',
  S3: 'Permanently stuck this run — remaining issues are blocked by non-agent issues.',
  S4: 'Cap reached — pickable issues remain. Re-run to continue.',
  'S-F3':
    'Infra failure (git push / gh pr create failed). Aborting loop to avoid burning tokens.',
};

// ─── Types ────────────────────────────────────────────────────────────────

interface GhIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  state: 'open' | 'closed';
}

interface PickableIssue extends GhIssue {
  blockers: number[];
  unresolvedBlockers: number[];
}

interface SubIssueRelation {
  number: number;
  state: string;
  relation_type?: string;
}

interface IterationResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  sessionId: string | null;
  transcript: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const log = (msg: string) => console.error(`[ralph] ${msg}`);
const step = (msg: string) => console.error(`[ralph] → ${msg}`);

function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout?: number } = {}
): IterationResult {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd,
    timeout: opts.timeout,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const signal = result.signal;
  return {
    exitCode: signal ? 130 : (result.status ?? 1),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? (result.error ? String(result.error.message) : ''),
    sessionId: null,
    transcript: result.stdout ?? '',
  };
}

async function ghJson<T = any>(args: string[]): Promise<T> {
  const r = await runCmd('gh', args);
  if (r.exitCode !== 0) {
    throw new Error(`gh ${args.join(' ')} failed (exit ${r.exitCode}):\n${r.stderr}`);
  }
  try {
    return JSON.parse(r.stdout) as T;
  } catch (e) {
    throw new Error(`gh ${args.join(' ')} returned non-JSON:\n${r.stdout.slice(0, 500)}`);
  }
}

async function ghText(args: string[]): Promise<string> {
  const r = await runCmd('gh', args);
  if (r.exitCode !== 0) {
    throw new Error(`gh ${args.join(' ')} failed (exit ${r.exitCode}):\n${r.stderr}`);
  }
  return r.stdout.trim();
}

async function checkTool(name: string): Promise<boolean> {
  const r = await runCmd(name, ['--version']);
  return r.exitCode === 0;
}

async function getRepoSlug(): Promise<string> {
  // gh infers from remote; we just need owner/name for the REST API.
  const slug = await ghText(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
  return slug;
}

// ─── Blocker resolution (Q2: A + B fallback) ──────────────────────────────

const BLOCKER_REGEX = /(?:blocked\s+by|depends\s+on)\s*[:#]?\s*#?\s*(\d+(?:\s*,\s*#?\s*\d+)*)/gi;

function parseBodyBlockers(body: string): number[] {
  if (!body) return [];
  const numbers: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(BLOCKER_REGEX.source, 'gi');
  while ((m = re.exec(body)) !== null) {
    for (const piece of m[1].split(/[,;]/)) {
      const n = parseInt(piece.trim(), 10);
      if (!Number.isNaN(n)) numbers.push(n);
    }
  }
  return Array.from(new Set(numbers));
}

async function resolveBlockers(
  issueNumber: number,
  body: string,
  repoSlug: string
): Promise<number[]> {
  // Primary (A): native GitHub sub-issue relationships via REST.
  try {
    const relations = await ghJson<SubIssueRelation[]>([
      'api',
      `repos/${repoSlug}/issues/${issueNumber}/sub_issues`,
    ]);
    if (Array.isArray(relations) && relations.length > 0) {
      const blockedBy = relations
        .filter((r) => (r.relation_type ?? '').toUpperCase() === 'BLOCKED_BY')
        .map((r) => r.number);
      if (blockedBy.length > 0) return blockedBy;
    }
  } catch {
    // Endpoint not available or 404 — fall through to body regex.
  }

  // Fallback (B): body-text convention.
  return parseBodyBlockers(body);
}

async function fetchIssueState(numbers: number[], repoSlug: string): Promise<Map<number, string>> {
  if (numbers.length === 0) return new Map();
  const states = new Map<number, string>();
  // Batch via `gh issue list --state all` filtered by number isn't supported,
  // so we fetch each. Pickable backlogs are small; this is fine.
  for (const n of numbers) {
    try {
      const issue = await ghJson<GhIssue>([
        'issue',
        'view',
        String(n),
        '--json',
        'number,state',
      ]);
      states.set(n, issue.state);
    } catch {
      // Issue might not exist; treat as unresolved.
      states.set(n, 'unknown');
    }
  }
  return states;
}

// ─── Picker (Q11: FIFO by issue number) ───────────────────────────────────

async function listReadyIssues(): Promise<GhIssue[]> {
  const issues = await ghJson<GhIssue[]>([
    'issue',
    'list',
    '--label',
    READY_LABEL,
    '--state',
    'open',
    '--json',
    'number,title,body,labels,state',
    '--limit',
    '100',
  ]);
  return issues;
}

async function listClaimedIssueNumbers(): Promise<Set<number>> {
  const r = await runCmd('git', ['ls-remote', '--heads', 'origin', `${BRANCH_PREFIX}*`]);
  if (r.exitCode !== 0) {
    log(`warning: git ls-remote failed; assuming no claimed branches. stderr: ${r.stderr}`);
    return new Set();
  }
  const numbers = new Set<number>();
  for (const line of r.stdout.split('\n')) {
    const m = line.match(new RegExp(`${BRANCH_PREFIX}(\\d+)`));
    if (m) numbers.add(parseInt(m[1], 10));
  }
  return numbers;
}

async function buildPickable(
  repoSlug: string
): Promise<{ pickable: PickableIssue[]; allReady: GhIssue[]; claimed: Set<number> }> {
  const allReady = await listReadyIssues();
  const claimed = await listClaimedIssueNumbers();

  // Filter out claimed, then resolve blockers.
  const candidates = allReady.filter((i) => !claimed.has(i.number));
  const pickable: PickableIssue[] = [];

  for (const issue of candidates) {
    const blockers = await resolveBlockers(issue.number, issue.body ?? '', repoSlug);
    let unresolvedBlockers: number[] = [];
    if (blockers.length > 0) {
      const states = await fetchIssueState(blockers, repoSlug);
      unresolvedBlockers = blockers.filter((n) => states.get(n) !== 'closed');
    }
    pickable.push({ ...issue, blockers, unresolvedBlockers });
  }

  // Sort by issue number ascending (FIFO).
  pickable.sort((a, b) => a.number - b.number);
  return { pickable, allReady, claimed };
}

function classifyStop(
  pickable: PickableIssue[],
  allReady: GhIssue[]
): { reason: string; explanation: string } | null {
  if (allReady.length === 0) return { reason: 'S1', explanation: stopReasonMessages.S1 };

  if (pickable.length === 0) {
    // Are all remaining issues blocked? Distinguish S2 from S3 by checking
    // whether any pickable issue's unresolved blockers include an open PR
    // (we approximate: any blocker that is still open counts as a blocker;
    // S2 vs S3 distinction is informational only — both exit 0).
    const allBlocked = allReady.every((i) => {
      // If it's not in pickable, either it's claimed or blocked.
      return !pickable.find((p) => p.number === i.number);
    });
    if (allBlocked) {
      // Heuristic: if any ready issue has unresolved blockers, we're waiting.
      return {
        reason: 'S2',
        explanation: stopReasonMessages.S2,
      };
    }
    return { reason: 'S3', explanation: stopReasonMessages.S3 };
  }
  return null;
}

// ─── The iteration (Q15 pseudocode) ───────────────────────────────────────

const ITERATION_PROMPT = `Implement GitHub issue #{N}. The issue body is attached.

You are on branch \`{BRANCH}\` (already created and checked out).

1. Read the issue body and CONTEXT.md / docs/adr/ if relevant.
2. Implement the smallest change that satisfies the issue.
3. Run feedback loops: \`npx nx run-many -t lint,test,build --affected\`.
   Fix until all three pass. Do not skip.
4. Commit with a conventional-commit message (e.g. \`feat(<scope>): <summary>\`).
5. Push to \`origin/{BRANCH}\`.
6. Stop when the branch is pushed and all checks are green.

If the issue is blocked by missing foundations, stop and say so explicitly
(start your final message with \`BLOCKED: <reason>\`). Do not fake it.
Do not close the issue, do not open a PR — the ralph script handles that.`;

function buildIterationPrompt(issueNumber: number, branch: string): string {
  return ITERATION_PROMPT.replace('{N}', String(issueNumber)).replace(
    /{BRANCH}/g,
    branch,
  );
}

function buildRetryFeedback(gateOutput: string, issueNumber: number): string {
  return `The verification gate failed with:

\`\`\`
${gateOutput.slice(-4000)}
\`\`\`

Fix these issues, commit, and push to \`origin/${BRANCH_PREFIX}${issueNumber}\`.`;
}

function buildCrashRetryFeedback(exitCode: number, issueNumber: number): string {
  return `Your previous attempt exited unexpectedly (exit code ${exitCode}). Continue implementing issue #${issueNumber}. You are on branch \`${BRANCH_PREFIX}${issueNumber}\`.`;
}

function buildNoCommitRetryFeedback(issueNumber: number): string {
  return `You made no commits in your previous attempt. Implement issue #${issueNumber}, run feedback loops, commit, and push to \`origin/${BRANCH_PREFIX}${issueNumber}\`.`;
}

function parseSessionIdFromTranscript(transcript: string): string | null {
  for (const line of transcript.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('{')) continue;
    try {
      const evt = JSON.parse(trimmed);
      if (evt.sessionID) return evt.sessionID as string;
    } catch {
      // skip non-JSON lines
    }
  }
  return null;
}

async function writeIssueBodyTemp(issue: PickableIssue): Promise<string> {
  const dir = join(tmpdir(), 'ralph');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const file = join(dir, `issue-${issue.number}-${randomUUID()}.md`);
  const body = `# ${issue.title}\n\nIssue #${issue.number}\n\n${issue.body ?? '(no body)'}`;
  await writeFile(file, body, 'utf8');
  return file;
}

async function invokeOpencode(
  issue: PickableIssue,
  branch: string,
  attempt: number,
  sessionId: string | null,
  model: string,
  issueBodyFile: string | null,
  retryFeedback: string | null,
): Promise<IterationResult> {
  const args: string[] = ['run', '--agent', RALPH_AGENT, '--model', model, '--format', 'json'];

  if (attempt === 1) {
    args.push(buildIterationPrompt(issue.number, branch));
    if (issueBodyFile) args.push('--file', issueBodyFile);
  } else {
    if (sessionId) args.push('--session', sessionId);
    args.push(retryFeedback ?? buildCrashRetryFeedback(1, issue.number));
  }

  step(`opencode run (attempt ${attempt}) for issue #${issue.number}`);
  const r = await runCmd('opencode', args, { timeout: 30 * 60 * 1000 }); // 30min per invocation
  const sessionIdFromTranscript = parseSessionIdFromTranscript(r.transcript);
  return {
    ...r,
    sessionId: sessionIdFromTranscript ?? sessionId,
  };
}

async function runGate(): Promise<IterationResult> {
  step('running full-scope gate: lint,test,build');
  return runCmd('npx', [
    'nx',
    'run-many',
    '-t',
    'lint,test,build',
    '--projects=' + FULL_GATE_PROJECTS,
    '--skip-nx-cache',
  ]);
}

async function getBranchCommits(branch: string, git: SimpleGit): Promise<string[]> {
  try {
    const log = await git.log({ from: `origin/${BASE_BRANCH}`, to: branch, '--oneline': null } as any);
    return log.all.map((c) => `${c.hash.slice(0, 7)} ${c.message}`);
  } catch {
    return [];
  }
}

async function getFirstCommitSubject(branch: string, git: SimpleGit): Promise<string> {
  try {
    const log = await git.log({ from: `origin/${BASE_BRANCH}`, to: branch, maxCount: 1 });
    return log.latest?.message ?? `Issue #${branch.replace(BRANCH_PREFIX, '')}`;
  } catch {
    return `Issue #${branch.replace(BRANCH_PREFIX, '')}`;
  }
}

async function openPr(
  issue: PickableIssue,
  branch: string,
  git: SimpleGit,
): Promise<string> {
  const title = await getFirstCommitSubject(branch, git);
  const body = `Closes #${issue.number}\n\nImplemented by ralph loop (agent: \`${RALPH_AGENT}\`).`;
  const url = await ghText([
    'pr',
    'create',
    '--base',
    BASE_BRANCH,
    '--head',
    branch,
    '--title',
    title,
    '--body',
    body,
  ]);
  return url;
}

async function relabelToReview(issueNumber: number): Promise<void> {
  await runCmd('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--remove-label',
    READY_LABEL,
    '--add-label',
    REVIEW_LABEL,
  ]);
}

async function commentOnIssue(issueNumber: number, body: string): Promise<void> {
  await runCmd('gh', ['issue', 'comment', String(issueNumber), '--body', body]);
}

async function deleteRemoteBranch(branch: string, git: SimpleGit): Promise<void> {
  try {
    await git.push('origin', branch, ['--delete']);
  } catch (e: any) {
    log(`warning: could not delete remote branch ${branch}: ${e.message}`);
  }
}

async function abandon(
  issue: PickableIssue,
  reason: string,
  logExcerpt: string,
): Promise<void> {
  step(`abandoning issue #${issue.number}: ${reason}`);
  const branch = `${BRANCH_PREFIX}${issue.number}`;
  const commentBody = `Ralph could not complete this issue after ${MAX_ATTEMPTS_PER_ISSUE} attempts.

**Reason:** ${reason}

<details><summary>Log excerpt</summary>

\`\`\`
${logExcerpt.slice(-4000)}
\`\`\`

</details>

The issue has been moved to \`${REVIEW_LABEL}\` for human inspection. The partial branch \`${branch}\` has been preserved for review.`;

  await commentOnIssue(issue.number, commentBody);
  await relabelToReview(issue.number);
}

async function cleanupBetweenIterations(git: SimpleGit, issueNumber: number): Promise<void> {
  const branch = `${BRANCH_PREFIX}${issueNumber}`;
  try {
    const status = await git.status();
    if (status.files.length > 0) {
      step(`stashing dirty working tree before checkout`);
      await git.stash(['push', '-u', '-m', `ralph-leftover-${issueNumber}`]);
    }
    await git.checkout(BASE_BRANCH);
  } catch (e: any) {
    log(`warning: cleanup failed: ${e.message}`);
    try {
      await git.checkout(BASE_BRANCH, ['--force']);
    } catch {
      // last resort — leave it; operator can intervene
    }
  }
}

// ─── The main loop ────────────────────────────────────────────────────────

interface RunOptions {
  maxIterations: number;
  maxMinutes: number | null;
  model: string;
  dryRun: boolean;
}

async function runRalphLoop(opts: RunOptions): Promise<number> {
  const git = simpleGit();

  // Startup checks
  step('checking required tools');
  for (const tool of ['gh', 'git', 'opencode']) {
    if (!(await checkTool(tool))) {
      console.error(`[ralph] error: required tool "${tool}" not found on PATH.`);
      return 1;
    }
  }

  step('fetching latest from origin');
  await git.fetch('origin', ['--prune']);

  const repoSlug = await getRepoSlug();
  log(`repo: ${repoSlug}`);
  log(`model: ${opts.model}`);
  log(`max iterations: ${opts.maxIterations}${opts.maxMinutes ? `, max minutes: ${opts.maxMinutes}` : ''}`);

  if (opts.dryRun) {
    step('dry-run — listing pickable issues only');
    return await listPickable(repoSlug);
  }

  const startTime = Date.now();
  let iterationCount = 0;
  const abandonedThisRun = new Set<number>();

  while (iterationCount < opts.maxIterations) {
    if (opts.maxMinutes && (Date.now() - startTime) / 1000 / 60 >= opts.maxMinutes) {
      log(stopReasonMessages.S4);
      return 0;
    }

    step(`iteration ${iterationCount + 1}/${opts.maxIterations}`);
    const { pickable, allReady, claimed } = await buildPickable(repoSlug);

    const stop = classifyStop(pickable, allReady);
    if (stop) {
      log(stop.explanation);
      return 0;
    }

    const issue = pickable.find((p) => !abandonedThisRun.has(p.number));
    if (!issue) {
      log('all pickable issues were abandoned this run; stopping');
      break;
    }
    const branch = `${BRANCH_PREFIX}${issue.number}`;
    log(`picked issue #${issue.number}: ${issue.title}`);
    if (issue.unresolvedBlockers.length > 0) {
      // Shouldn't happen (we filtered), but be defensive.
      log(`  unresolved blockers: ${issue.unresolvedBlockers.join(', ')}`);
    }

    let attempt = 0;
    let sessionId: string | null = null;
    let issueResolved = false;

    while (attempt < MAX_ATTEMPTS_PER_ISSUE) {
      attempt++;

      if (attempt === 1) {
        iterationCount++;

        // Claim: branch from main, push (CAS via remote ref).
        step(`claiming: checkout ${BASE_BRANCH}, create ${branch}`);
        try {
          await git.checkout(BASE_BRANCH);
          await git.pull('origin', BASE_BRANCH, ['--ff-only']);
          await git.checkoutLocalBranch(branch);
        } catch (e: any) {
          log(`error preparing branch: ${e.message}`);
          abandonedThisRun.add(issue.number);
          await cleanupBetweenIterations(git, issue.number);
          break;
        }

        try {
          await git.push('origin', branch, ['-u']);
        } catch (e: any) {
          log(`claim race lost on issue #${issue.number} (push rejected). Skipping.`);
          try {
            await git.checkout(BASE_BRANCH);
            await git.deleteLocalBranch(branch, true);
          } catch {}
          break;
        }
      } else {
        step(`retry: checkout existing branch ${branch}`);
        await git.checkout(branch);
      }

      // Invoke opencode
      let issueBodyFile: string | null = null;
      if (attempt === 1) {
        issueBodyFile = await writeIssueBodyTemp(issue);
      }
      let retryFeedback: string | null = null;
      const opencodeResult = await invokeOpencode(
        issue,
        branch,
        attempt,
        sessionId,
        opts.model,
        issueBodyFile,
        retryFeedback,
      );
      sessionId = opencodeResult.sessionId;

      if (issueBodyFile) {
        await rm(issueBodyFile, { force: true }).catch(() => {});
      }

      // F1: opencode crashed / non-zero exit
      if (opencodeResult.exitCode !== 0) {
        log(`opencode exited non-zero (code ${opencodeResult.exitCode}) on attempt ${attempt}`);
        if (attempt < MAX_ATTEMPTS_PER_ISSUE) {
          retryFeedback = buildCrashRetryFeedback(opencodeResult.exitCode, issue.number);
          await cleanupBetweenIterations(git, issue.number);
          continue;
        }
        await abandon(
          issue,
          `Agent crashed twice (last exit code ${opencodeResult.exitCode})`,
          opencodeResult.stderr + '\n' + opencodeResult.stdout,
        );
        abandonedThisRun.add(issue.number);
        issueResolved = false;
        break;
      }

      // F4: no commits on the branch
      const commits = await getBranchCommits(branch, git);
      if (commits.length === 0) {
        log(`no commits produced on attempt ${attempt}`);
        if (attempt < MAX_ATTEMPTS_PER_ISSUE) {
          retryFeedback = buildNoCommitRetryFeedback(issue.number);
          await cleanupBetweenIterations(git, issue.number);
          continue;
        }
        await abandon(
          issue,
          'Agent produced no commits in 2 attempts',
          opencodeResult.stdout,
        );
        abandonedThisRun.add(issue.number);
        issueResolved = false;
        break;
      }

      // Push any new commits the agent made
      try {
        await git.push('origin', branch);
      } catch (e: any) {
        log(`error pushing agent commits: ${e.message}`);
        // Treat as F3 — infra failure
        console.error(`[ralph] ${stopReasonMessages['S-F3']}`);
        return 0;
      }

      // Gate: full-scope lint+test+build
      const gate = await runGate();
      if (gate.exitCode !== 0) {
        log(`gate failed on attempt ${attempt}`);
        if (attempt < MAX_ATTEMPTS_PER_ISSUE) {
          retryFeedback = buildRetryFeedback(gate.stdout + '\n' + gate.stderr, issue.number);
          await cleanupBetweenIterations(git, issue.number);
          continue;
        }
        await abandon(
          issue,
          'Verification gate failed twice',
          gate.stdout + '\n' + gate.stderr,
        );
        abandonedThisRun.add(issue.number);
        issueResolved = false;
        break;
      }

      // Gate passed — open PR
      let prUrl: string;
      try {
        prUrl = await openPr(issue, branch, git);
      } catch (e: any) {
        log(`error opening PR: ${e.message}`);
        console.error(`[ralph] ${stopReasonMessages['S-F3']}`);
        return 0;
      }
      log(`opened PR: ${prUrl}`);

      // L1: relabel + comment
      try {
        await relabelToReview(issue.number);
        await commentOnIssue(issue.number, `Ralph opened PR: ${prUrl}`);
      } catch (e: any) {
        log(`warning: failed to relabel/comment on issue #${issue.number}: ${e.message}`);
      }

      issueResolved = true;
      break;
    }

    if (!issueResolved) {
      log(`issue #${issue.number} not resolved; continuing to next issue`);
    }

    // Cleanup between iterations
    await cleanupBetweenIterations(git, issue.number);
  }

  log(stopReasonMessages.S4);
  return 0;
}

// ─── Subcommands ──────────────────────────────────────────────────────────

async function listPickable(repoSlug: string): Promise<number> {
  const { pickable, allReady, claimed } = await buildPickable(repoSlug);

  log(`ready-for-agent issues: ${allReady.length}`);
  log(`already claimed (branches): ${claimed.size}`);
  log(`pickable (unblocked, unclaimed): ${pickable.length}`);
  console.log('');

  if (pickable.length === 0) {
    const stop = classifyStop(pickable, allReady);
    if (stop) console.log(`${stop.reason} — ${stop.explanation}`);
    return 0;
  }

  console.log('Pickable issues (FIFO order):');
  for (const issue of pickable) {
    const blockers =
      issue.unresolvedBlockers.length > 0
        ? `  [blocked by: ${issue.unresolvedBlockers.join(', ')}]`
        : '';
    console.log(`  #${issue.number}  ${issue.title}${blockers}`);
  }
  console.log('');
  console.log(`Next pick: #${pickable[0].number}`);
  return 0;
}

async function resetIssue(issueNumber: number): Promise<number> {
  const git = simpleGit();
  step(`resetting issue #${issueNumber}`);

  const branch = `${BRANCH_PREFIX}${issueNumber}`;
  log(`deleting remote branch ${branch}`);
  await deleteRemoteBranch(branch, git);

  log(`deleting local branch ${branch} (if present)`);
  try {
    await git.deleteLocalBranch(branch, true);
  } catch (e: any) {
    log(`  local branch not present or already deleted: ${e.message}`);
  }

  log(`relabeling issue #${issueNumber}: ${READY_LABEL} (remove ${REVIEW_LABEL} if present)`);
  try {
    await runCmd('gh', [
      'issue',
      'edit',
      String(issueNumber),
      '--add-label',
      READY_LABEL,
      '--remove-label',
      REVIEW_LABEL,
    ]);
  } catch (e: any) {
    log(`warning: gh issue edit failed: ${e.message}`);
  }

  log(`reset complete for issue #${issueNumber}`);
  return 0;
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log(`Ralph loop — autonomous AFK agent driver

Usage:
  npx tsx scripts/ralph.ts run [--max-iterations N] [--max-minutes N] [--model m] [--dry-run]
  npx tsx scripts/ralph.ts list
  npx tsx scripts/ralph.ts reset <N>

Commands:
  run (default)   Run the ralph loop. Picks one issue per iteration, up to --max-iterations.
  list            Dry-run: list pickable issues in FIFO order, don't execute.
  reset <N>       Manually reclaim a stuck issue (deletes branch, relabels to ready-for-agent).

Flags (for run):
  --max-iterations <N>    Max opencode invocations (default: ${DEFAULT_MAX_ITERATIONS})
  --max-minutes <N>       Time ceiling in minutes (default: off)
  --model <provider/model>  Override ralph agent's model (default: ${DEFAULT_MODEL})
  --dry-run               Alias for \`list\``);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    return 0;
  }

  let subcommand = 'run';
  let positional: string[] = [];

  if (args[0] === 'run' || args[0] === 'list' || args[0] === 'reset') {
    subcommand = args[0];
    positional = args.slice(1);
  } else {
    // Treat first arg as a flag for the default `run` subcommand.
    positional = args;
  }

  if (subcommand === 'reset') {
    if (positional.length === 0) {
      console.error('[ralph] error: reset requires an issue number');
      printUsage();
      return 1;
    }
    const n = parseInt(positional[0], 10);
    if (Number.isNaN(n)) {
      console.error(`[ralph] error: invalid issue number: ${positional[0]}`);
      return 1;
    }
    return await resetIssue(n);
  }

  if (subcommand === 'list') {
    const repoSlug = await getRepoSlug();
    return await listPickable(repoSlug);
  }

  // subcommand === 'run'
  const { values } = parseArgs({
    args: positional,
    options: {
      'max-iterations': { type: 'string', default: String(DEFAULT_MAX_ITERATIONS) },
      'max-minutes': { type: 'string' },
      model: { type: 'string', default: DEFAULT_MODEL },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    return 0;
  }

  const maxIterations = parseInt(values['max-iterations'] as string, 10);
  if (Number.isNaN(maxIterations) || maxIterations < 1) {
    console.error(`[ralph] error: invalid --max-iterations: ${values['max-iterations']}`);
    return 1;
  }

  let maxMinutes: number | null = null;
  if (values['max-minutes']) {
    maxMinutes = parseInt(values['max-minutes'] as string, 10);
    if (Number.isNaN(maxMinutes) || maxMinutes < 1) {
      console.error(`[ralph] error: invalid --max-minutes: ${values['max-minutes']}`);
      return 1;
    }
  }

  return await runRalphLoop({
    maxIterations,
    maxMinutes,
    model: values.model as string,
    dryRun: values['dry-run'] as boolean,
  });
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error(`[ralph] fatal: ${err?.stack ?? err}`);
    process.exit(1);
  });
