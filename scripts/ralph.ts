#!/usr/bin/env node
// scripts/ralph.ts
//
// Ralph loop — autonomous AFK agent driver for opencode.
// Reads `ready-for-agent` GitHub issues, picks one per iteration,
// invokes `opencode run --agent ralph` against it in a round-based
// state machine: Implementation → Gate-fix loop (G=3) → Code-review
// → Review-fix loop (R=2), with strict gate↔review cycling.
// Total rounds capped at T=10. Opens a PR per issue on review sign-off.
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
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ─── Constants from the grilling session ──────────────────────────────────

const RALPH_AGENT = 'ralph';
const REVIEWER_AGENT = 'ralph-reviewer';
const DEFAULT_MODEL = 'opencode-go/deepseek-v4-pro';
const DEFAULT_MAX_ITERATIONS = 10;
const GATE_FIX_CAP = 3;
const REVIEW_FIX_CAP = 2;
const TOTAL_ROUND_CAP = 10;
const INFRA_RETRY_MAX = 3;
const INFRA_RETRY_BACKOFF_MS = 5_000;
const IMPL_TIMEOUT_MS = 45 * 60 * 1000;
const FIX_TIMEOUT_MS = 20 * 60 * 1000;
const REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const BRANCH_PREFIX = 'agent/issue-';
const READY_LABEL = 'ready-for-agent';
const PRD_LABEL = 'prd';
const REVIEW_LABEL = 'ready-for-human';
const FULL_GATE_TARGETS = ['lint', 'test', 'build'];
const FULL_GATE_PROJECTS = [
  'mobile',
  'admin',
  'api',
  'domain',
  'api-contracts',
  'map',
  'i18n',
  'ui',
];
const BASE_BRANCH = 'main';

const stopReasonMessages: Record<string, string> = {
  S1: 'Done — no ready-for-agent issues remain.',
  S2: 'Waiting on review — all remaining issues are blocked by unmerged PRs.',
  S3: 'Permanently stuck this run — remaining issues are blocked by non-agent issues.',
  S4: 'Cap reached — pickable issues remain. Re-run to continue.',
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

type RoundType = 'implementation' | 'gate-fix' | 'review-fix';
type RoundOutcome = 'crash' | 'no-commits' | 'gate-fail' | 'gate-pass' | 'review-findings' | 'review-clean';

interface RoundLogEntry {
  type: RoundType | 'gate' | 'code-review';
  outcome: RoundOutcome;
  note: string;
}

interface AttemptState {
  phase:
    | 'implementation'
    | 'gate'
    | 'gate-fix'
    | 'code-review'
    | 'review-fix'
    | 'open-pr'
    | 'abandon';
  sessionId: string | null;
  gateFixUsed: number;
  reviewFixUsed: number;
  totalRounds: number;
  roundLog: RoundLogEntry[];
  usedFallback: boolean;
  gateFeedback: string | null;
  reviewFindings: string | null;
  abandonReason: string | null;
}

interface ImprovementRoundResult {
  newCommits: boolean;
  crashed: boolean;
  sessionId: string | null;
  usedFallback: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ReviewRoundResult {
  clean: boolean;
  findings: string | null;
  crashed: boolean;
  output: string;
}

interface GateFailureStructure {
  failedProjects: { project: string; targets: string[] }[];
  summary: string;
  fullOutput: string;
}

type CmdRunner = (cmd: string, args: string[], opts?: { cwd?: string; timeout?: number; inheritStdio?: boolean }) => IterationResult;

// ─── Helpers ──────────────────────────────────────────────────────────────

const log = (msg: string) => console.error(`[ralph] ${msg}`);
const step = (msg: string) => console.error(`[ralph] → ${msg}`);

function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout?: number; inheritStdio?: boolean } = {}
): IterationResult {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd,
    timeout: opts.timeout,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: opts.inheritStdio ? 'inherit' : undefined,
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
  // Defensive: never pick up umbrella PRDs, even if one accidentally carries
  // the ready-for-agent label. Only leaf issues are units of work.
  return issues.filter((i) => !i.labels.some((l) => l.name === PRD_LABEL));
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

function buildCrashRetryFeedback(exitCode: number, issueNumber: number): string {
  return `Your previous attempt exited unexpectedly (exit code ${exitCode}). Continue implementing issue #${issueNumber}. You are on branch \`${BRANCH_PREFIX}${issueNumber}\`.`;
}

function buildNoCommitRetryFeedback(issueNumber: number): string {
  return `You made no commits in your previous attempt. Implement issue #${issueNumber}, run feedback loops, commit, and push to \`origin/${BRANCH_PREFIX}${issueNumber}\`.`;
}

export function parseSessionIdFromTranscript(transcript: string): string | null {
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

export function parseReviewToken(output: string): { clean: boolean; findings: string | null } {
  const trimmed = output.trimEnd();
  const findingsMatch = trimmed.match(/REVIEW_FINDINGS:\s*\n?([\s\S]*)$/);
  if (findingsMatch && trimmed.includes('REVIEW_FINDINGS:')) {
    return { clean: false, findings: findingsMatch[1].trim() || '' };
  }
  if (trimmed.endsWith('REVIEW_CLEAN')) {
    return { clean: true, findings: null };
  }
  return { clean: false, findings: null };
}

export function structureGateFailure(output: string): GateFailureStructure {
  const failedProjects: { project: string; targets: string[] }[] = [];
  const projectTargetRegex = /> NX\s+(?:Running|Executing).*?(\w+):(\w+)/g;
  const failRegex = /Failed.*?(\w+):(\w+)/g;
  const seen = new Map<string, Set<string>>();

  for (const m of output.matchAll(failRegex)) {
    const project = m[1];
    const target = m[2];
    if (!seen.has(project)) seen.set(project, new Set());
    seen.get(project)!.add(target);
  }

  if (seen.size === 0) {
    const nxErrorRegex = /(\w+):(\w+)\s.*failed/gi;
    for (const m of output.matchAll(nxErrorRegex)) {
      const project = m[1];
      const target = m[2];
      if (!seen.has(project)) seen.set(project, new Set());
      seen.get(project)!.add(target);
    }
  }

  for (const [project, targets] of seen) {
    failedProjects.push({ project, targets: [...targets] });
  }

  const summary = failedProjects.length > 0
    ? failedProjects.map(fp => `${fp.project}: ${fp.targets.join(', ')}`).join('\n')
    : 'Unknown failures — see full output below.';

  return { failedProjects, summary, fullOutput: output };
}

export function buildRoundLog(log: RoundLogEntry[]): string {
  if (log.length === 0) return '(no prior rounds)';
  return log.map((e, i) => `  Round ${i + 1} [${e.type}]: ${e.outcome} — ${e.note}`).join('\n');
}

export function buildGateFixFeedback(structured: GateFailureStructure, issueNumber: number): string {
  return `The verification gate failed. The following projects/targets need fixing:

${structured.summary}

Fix these issues, commit, and push to \`origin/${BRANCH_PREFIX}${issueNumber}\`.

<details><summary>Full gate output</summary>

\`\`\`
${structured.fullOutput.slice(-4000)}
\`\`\`

</details>`;
}

export function buildReviewFixFeedback(findings: string, issueNumber: number): string {
  return `Code review found the following issues:

${findings}

Address each finding, commit, and push to \`origin/${BRANCH_PREFIX}${issueNumber}\`.
After your fix, the gate and review will both re-run.`;
}

export function buildFallbackFeedback(
  issueNumber: number,
  branch: string,
  diff: string,
  roundLog: RoundLogEntry[],
  currentFeedback: string,
): string {
  return `Your previous session could not be resumed. You are being cold-started with context.

You are on branch \`${branch}\` working on issue #${issueNumber}.

## Current task
${currentFeedback}

## Diff from main (your progress so far)
\`\`\`diff
${diff.slice(-8000)}
\`\`\`

## Prior rounds
${buildRoundLog(roundLog)}

Continue from where the previous rounds left off. Commit and push to \`origin/${branch}\`.`;
}

export function createInitialState(): AttemptState {
  return {
    phase: 'implementation',
    sessionId: null,
    gateFixUsed: 0,
    reviewFixUsed: 0,
    totalRounds: 0,
    roundLog: [],
    usedFallback: false,
    gateFeedback: null,
    reviewFindings: null,
    abandonReason: null,
  };
}

export function nextAttemptState(
  current: AttemptState,
  result: ImprovementRoundResult | ReviewRoundResult,
  gateOutput?: IterationResult,
): AttemptState {
  const s: AttemptState = {
    ...current,
    roundLog: [...current.roundLog],
  };

  if ('clean' in result) {
    if (result.crashed) {
      s.roundLog.push({ type: 'code-review', outcome: 'review-findings', note: 'reviewer crashed' });
      s.phase = 'code-review';
      return s;
    }
    if (result.clean) {
      s.roundLog.push({ type: 'code-review', outcome: 'review-clean', note: 'review passed' });
      s.phase = 'open-pr';
      s.reviewFindings = null;
      return s;
    }
    s.reviewFixUsed++;
    s.roundLog.push({ type: 'code-review', outcome: 'review-findings', note: 'review found issues' });
    s.reviewFindings = result.findings;
    if (s.reviewFixUsed > REVIEW_FIX_CAP) {
      s.phase = 'abandon';
      s.abandonReason = `Review-fix cap hit (${REVIEW_FIX_CAP})`;
      return s;
    }
    if (s.totalRounds >= TOTAL_ROUND_CAP) {
      s.phase = 'abandon';
      s.abandonReason = `Total round cap hit (${TOTAL_ROUND_CAP})`;
      return s;
    }
    s.phase = 'review-fix';
    s.usedFallback = false;
    return s;
  }

  if (result.crashed || !result.newCommits) {
    s.totalRounds++;
    const outcome = result.crashed ? 'crash' : 'no-commits';
    const note = result.crashed
      ? `exited with code ${result.exitCode}`
      : 'no new commits produced';
    s.roundLog.push({ type: current.phase as RoundType, outcome, note });
    s.sessionId = result.sessionId ?? s.sessionId;

    if (current.usedFallback) {
      s.phase = 'abandon';
      s.abandonReason = `Double failure: ${outcome} on fallback round`;
      return s;
    }
    if (s.totalRounds >= TOTAL_ROUND_CAP) {
      s.phase = 'abandon';
      s.abandonReason = `Total round cap hit (${TOTAL_ROUND_CAP})`;
      return s;
    }
    s.usedFallback = true;
    return s;
  }

  s.totalRounds++;
  s.usedFallback = false;
  s.sessionId = result.sessionId ?? s.sessionId;
  s.roundLog.push({ type: current.phase as RoundType, outcome: 'gate-pass', note: 'new commits pushed' });

  if (s.totalRounds >= TOTAL_ROUND_CAP) {
    s.phase = 'abandon';
    s.abandonReason = `Total round cap hit (${TOTAL_ROUND_CAP})`;
    return s;
  }

  if (current.phase === 'review-fix') {
    s.phase = 'gate';
    s.gateFeedback = null;
    return s;
  }

  if (current.phase === 'implementation' || current.phase === 'gate-fix') {
    s.phase = 'gate';
    s.gateFeedback = null;
    return s;
  }

  return s;
}

export function nextAfterGate(current: AttemptState, gateResult: IterationResult): AttemptState {
  const s: AttemptState = {
    ...current,
    roundLog: [...current.roundLog],
  };

  if (gateResult.exitCode === 0) {
    s.roundLog.push({ type: 'gate', outcome: 'gate-pass', note: 'gate passed' });
    s.phase = 'code-review';
    s.gateFeedback = null;
    return s;
  }

  s.gateFixUsed++;
  s.roundLog.push({ type: 'gate', outcome: 'gate-fail', note: 'gate failed' });
  s.gateFeedback = gateResult.stdout + '\n' + gateResult.stderr;

  if (s.gateFixUsed > GATE_FIX_CAP) {
    s.phase = 'abandon';
    s.abandonReason = `Gate-fix cap hit (${GATE_FIX_CAP})`;
    return s;
  }
  if (s.totalRounds >= TOTAL_ROUND_CAP) {
    s.phase = 'abandon';
    s.abandonReason = `Total round cap hit (${TOTAL_ROUND_CAP})`;
    return s;
  }
  s.phase = 'gate-fix';
  s.usedFallback = false;
  return s;
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
  args: string[],
  timeout: number,
  label: string,
): Promise<IterationResult> {
  step(`opencode run: ${label}`);
  const r = runCmd('opencode', args, { timeout });
  const sessionIdFromTranscript = parseSessionIdFromTranscript(r.transcript);
  return {
    ...r,
    sessionId: sessionIdFromTranscript,
  };
}

function buildOpencodeArgs(
  opts: {
    agent: string;
    model: string;
    prompt: string;
    sessionId?: string | null;
    issueBodyFile?: string | null;
  },
): string[] {
  const args: string[] = ['run', '--agent', opts.agent, '--model', opts.model, '--format', 'json'];
  if (opts.sessionId) args.push('--session', opts.sessionId);
  args.push(opts.prompt);
  if (opts.issueBodyFile) args.push('--file', opts.issueBodyFile);
  return args;
}

async function runGate(): Promise<IterationResult> {
  step('running full-scope gate: lint,test,build');
  return runCmd('npx', [
    'nx',
    'run-many',
    '-t',
    ...FULL_GATE_TARGETS,
    '-p',
    ...FULL_GATE_PROJECTS,
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
  state: AttemptState,
): Promise<void> {
  step(`abandoning issue #${issue.number}: ${reason}`);
  const branch = `${BRANCH_PREFIX}${issue.number}`;
  const roundSummary = state.roundLog.map((e, i) =>
    `  Round ${i + 1} [${e.type}]: ${e.outcome} — ${e.note}`,
  ).join('\n');
  const commentBody = `Ralph could not complete this issue after ${state.totalRounds} rounds.

**Reason:** ${reason}

**Round log:**
\`\`\`
${roundSummary || '(no rounds completed)'}
\`\`\`

**Caps:** gate-fix ${state.gateFixUsed}/${GATE_FIX_CAP}, review-fix ${state.reviewFixUsed}/${REVIEW_FIX_CAP}, total ${state.totalRounds}/${TOTAL_ROUND_CAP}

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

// ─── Round runners ────────────────────────────────────────────────────────

async function getDiffFromMain(branch: string): Promise<string> {
  const r = runCmd('git', ['diff', `${BASE_BRANCH}...${branch}`]);
  return r.stdout;
}

async function getCommitCount(branch: string, git: SimpleGit): Promise<number> {
  try {
    const log = await git.log({ from: `origin/${BASE_BRANCH}`, to: branch });
    return log.total;
  } catch {
    return 0;
  }
}

async function runImprovementRound(opts: {
  issue: PickableIssue;
  branch: string;
  state: AttemptState;
  model: string;
  issueBodyFile: string;
  git: SimpleGit;
}): Promise<ImprovementRoundResult> {
  const { issue, branch, state, model, issueBodyFile, git } = opts;
  const isImplementation = state.phase === 'implementation';
  const timeout = isImplementation ? IMPL_TIMEOUT_MS : FIX_TIMEOUT_MS;

  let prompt: string;
  let sessionId: string | null = null;
  let usedFallback = false;

  if (isImplementation) {
    prompt = buildIterationPrompt(issue.number, branch);
  } else if (!state.usedFallback && state.sessionId) {
    sessionId = state.sessionId;
    const feedback = state.gateFeedback
      ? buildGateFixFeedback(structureGateFailure(state.gateFeedback), issue.number)
      : state.reviewFindings
        ? buildReviewFixFeedback(state.reviewFindings, issue.number)
        : buildCrashRetryFeedback(1, issue.number);
    prompt = feedback;
  } else {
    usedFallback = true;
    const diff = await getDiffFromMain(branch);
    const feedback = state.gateFeedback
      ? buildGateFixFeedback(structureGateFailure(state.gateFeedback), issue.number)
      : state.reviewFindings
        ? buildReviewFixFeedback(state.reviewFindings, issue.number)
        : buildNoCommitRetryFeedback(issue.number);
    prompt = buildFallbackFeedback(issue.number, branch, diff, state.roundLog, feedback);
  }

  const args = buildOpencodeArgs({
    agent: RALPH_AGENT,
    model,
    prompt,
    sessionId,
    issueBodyFile: isImplementation || usedFallback ? issueBodyFile : null,
  });

  const commitsBefore = await getCommitCount(branch, git);
  const result = await invokeOpencode(args, timeout, `${state.phase} round for #${issue.number}`);

  if (result.exitCode !== 0) {
    return { newCommits: false, crashed: true, sessionId: result.sessionId, usedFallback, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
  }

  const commitsAfter = await getCommitCount(branch, git);
  return { newCommits: commitsAfter > commitsBefore, crashed: false, sessionId: result.sessionId, usedFallback, exitCode: 0, stdout: result.stdout, stderr: result.stderr };
}

async function runReviewRound(opts: {
  issue: PickableIssue;
  branch: string;
  model: string;
  issueBodyFile: string;
}): Promise<ReviewRoundResult> {
  const { issue, branch, model, issueBodyFile } = opts;
  const diff = await getDiffFromMain(branch);

  const diffFile = join(tmpdir(), 'ralph', `diff-${issue.number}-${randomUUID()}.txt`);
  const dir = join(tmpdir(), 'ralph');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(diffFile, diff, 'utf8');

  const prompt = `Review the code changes on branch \`${branch}\` for issue #${issue.number}.

The issue body is attached. The diff from \`${BASE_BRANCH}\` is attached.

Review criteria:
1. Does the implementation satisfy the issue spec?
2. Are edge cases handled?
3. Is type safety maintained (no \`any\`, no \`@ts-ignore\`)?
4. Are tests present where appropriate?
5. Do the changes follow patterns in neighboring files?

Your final message MUST end with exactly one of these tokens:
- \`REVIEW_CLEAN\` — if no actionable issues found
- \`REVIEW_FINDINGS:\` followed by a numbered list of concrete, fixable findings

Do not say anything after the token and findings list.`;

  const args = buildOpencodeArgs({
    agent: REVIEWER_AGENT,
    model,
    prompt,
    issueBodyFile,
  });
  args.push('--file', diffFile);

  const result = await invokeOpencode(args, REVIEW_TIMEOUT_MS, `code-review for #${issue.number}`);
  await rm(diffFile, { force: true }).catch(() => {});

  if (result.exitCode !== 0) {
    return { clean: false, findings: null, crashed: true, output: result.stdout };
  }

  const parsed = parseReviewToken(result.stdout);
  return { clean: parsed.clean, findings: parsed.findings, crashed: false, output: result.stdout };
}

async function pushWithRetry(git: SimpleGit, branch: string): Promise<boolean> {
  for (let i = 0; i < INFRA_RETRY_MAX; i++) {
    try {
      await git.push('origin', branch);
      return true;
    } catch (e: any) {
      log(`push attempt ${i + 1}/${INFRA_RETRY_MAX} failed: ${e.message}`);
      if (i < INFRA_RETRY_MAX - 1) {
        await new Promise(r => setTimeout(r, INFRA_RETRY_BACKOFF_MS));
      }
    }
  }
  return false;
}

async function openPrWithRetry(
  issue: PickableIssue,
  branch: string,
  git: SimpleGit,
): Promise<string | null> {
  for (let i = 0; i < INFRA_RETRY_MAX; i++) {
    try {
      return await openPr(issue, branch, git);
    } catch (e: any) {
      log(`PR create attempt ${i + 1}/${INFRA_RETRY_MAX} failed: ${e.message}`);
      if (i < INFRA_RETRY_MAX - 1) {
        await new Promise(r => setTimeout(r, INFRA_RETRY_BACKOFF_MS));
      }
    }
  }
  return null;
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
  log(`max total rounds: ${opts.maxIterations}${opts.maxMinutes ? `, max minutes: ${opts.maxMinutes}` : ''}`);

  if (opts.dryRun) {
    step('dry-run — listing pickable issues only');
    return await listPickable(repoSlug);
  }

  const startTime = Date.now();
  let totalRoundCount = 0;
  const abandonedThisRun = new Set<number>();

  while (totalRoundCount < opts.maxIterations) {
    if (opts.maxMinutes && (Date.now() - startTime) / 1000 / 60 >= opts.maxMinutes) {
      log(stopReasonMessages.S4);
      return 0;
    }

    step(`picking next issue (total rounds so far: ${totalRoundCount}/${opts.maxIterations})`);
    const { pickable, allReady } = await buildPickable(repoSlug);

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

    let state = createInitialState();

    step(`claiming: checkout ${BASE_BRANCH}, create ${branch}`);
    try {
      await git.checkout(BASE_BRANCH);
      await git.pull('origin', BASE_BRANCH, ['--ff-only']);
      await git.checkoutLocalBranch(branch);
    } catch (e: any) {
      log(`error preparing branch: ${e.message}`);
      abandonedThisRun.add(issue.number);
      await cleanupBetweenIterations(git, issue.number);
      continue;
    }

    try {
      await git.push('origin', branch, ['-u']);
    } catch (e: any) {
      log(`claim race lost on issue #${issue.number} (push rejected). Skipping.`);
      try {
        await git.checkout(BASE_BRANCH);
        await git.deleteLocalBranch(branch, true);
      } catch {}
      continue;
    }

    const issueBodyFile = await writeIssueBodyTemp(issue);
    let reviewCrashRetries = 0;
    const MAX_REVIEW_CRASH_RETRIES = 3;

    try {
      while (state.phase !== 'open-pr' && state.phase !== 'abandon') {
        if (opts.maxMinutes && (Date.now() - startTime) / 1000 / 60 >= opts.maxMinutes) {
          state.phase = 'abandon';
          state.abandonReason = 'Time ceiling reached';
          break;
        }

        if (state.phase === 'implementation' || state.phase === 'gate-fix' || state.phase === 'review-fix') {
          const result = await runImprovementRound({ issue, branch, state, model: opts.model, issueBodyFile, git });
          totalRoundCount++;
          
          if (result.crashed) {
            log(`round crashed: exit code ${result.exitCode}`);
            if (result.stderr) log(`stderr: ${result.stderr.slice(0, 500)}`);
          }
          
          state = nextAttemptState(state, result);

          if (state.phase === 'abandon') break;

          if (result.newCommits && !result.crashed) {
            const pushed = await pushWithRetry(git, branch);
            if (!pushed) {
              state.phase = 'abandon';
              state.abandonReason = 'Infra failure: git push failed after retries';
              break;
            }
          }
          continue;
        }

        if (state.phase === 'gate') {
          const gateResult = await runGate();
          state = nextAfterGate(state, gateResult);
          continue;
        }

        if (state.phase === 'code-review') {
          const reviewResult = await runReviewRound({ issue, branch, model: opts.model, issueBodyFile });

          if (reviewResult.crashed) {
            reviewCrashRetries++;
            if (reviewCrashRetries >= MAX_REVIEW_CRASH_RETRIES) {
              state.phase = 'abandon';
              state.abandonReason = `Reviewer agent crashed ${MAX_REVIEW_CRASH_RETRIES} times`;
              break;
            }
            continue;
          }
          reviewCrashRetries = 0;
          state = nextAttemptState(state, reviewResult);
          continue;
        }
      }

      if (state.phase === 'open-pr') {
        const prUrl = await openPrWithRetry(issue, branch, git);
        if (!prUrl) {
          await abandon(issue, 'Infra failure: gh pr create failed after retries', state);
        } else {
          log(`opened PR: ${prUrl}`);
          try {
            await relabelToReview(issue.number);
            await commentOnIssue(issue.number, `Ralph opened PR: ${prUrl}`);
          } catch (e: any) {
            log(`warning: failed to relabel/comment on issue #${issue.number}: ${e.message}`);
          }
        }
      } else if (state.phase === 'abandon') {
        await abandon(issue, state.abandonReason ?? 'Unknown reason', state);
        abandonedThisRun.add(issue.number);
      }
    } finally {
      await rm(issueBodyFile, { force: true }).catch(() => {});
    }

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
  --max-iterations <N>    Max total rounds across all issues (default: ${DEFAULT_MAX_ITERATIONS})
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

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error(`[ralph] fatal: ${err?.stack ?? err}`);
      process.exit(1);
    });
}
