# PRD: Ralph Loop Reliability — Round-Based Flow with Strict Gate↔Review Cycling

## Problem Statement

As the operator of the Ralph autonomous agent loop, I am frequently finding that Ralph does not complete issues properly. Two failure modes recur: (1) the agent produces no commits — either because the work took too long and timed out, or because a retry lost all context from the previous attempt and restarted from scratch; (2) the verification gate fails and the agent's retry also fails, leading to abandonment after just 2 attempts. The current attempt-based flow (`MAX_ATTEMPTS_PER_ISSUE = 2`) treats every retry as a cold start with a vague one-line prompt, has a broken session-continuity mechanism (session IDs are never captured), includes e2e projects in the gate that the agent cannot fix, and silently succeeds on infra failures (push/PR create errors return exit 0). These issues make the loop unreliable for unattended operation.

## Solution

Replace the attempt-based flow with a single attempt per issue containing up to T=10 rounds, organized as a strict state machine: Implementation Round → Gate-fix loop (cap G=3) → Code-Review Round → Review-fix loop (cap R=2), where every review-fix re-proves the gate and re-earns review sign-off. Continuity is hybrid: session-resume first (fixing the session ID capture bug), with git-state fallback (cold start including `git diff main...branch` and a round log) when the session is missing or a round produces no new commits. Code-review is performed by a separate reviewer agent (cold-started, no shared session) that emits a structured `REVIEW_CLEAN` or `REVIEW_FINDINGS:` token. The gate drops e2e projects and matches the ralph agent's documented project list. Infra failures retry then abandon with a clear comment, never returning success silently.

## User Stories

1. As the Ralph loop operator, I want failed gate checks to stay on the same attempt and enter improvement rounds, so that the agent iterates on the same work rather than restarting from scratch.
2. As the Ralph loop operator, I want the agent's session to persist across rounds within an attempt, so that fixes build on prior context instead of losing it.
3. As the Ralph loop operator, I want a git-state fallback when session resume fails, so that a corrupted session doesn't abandon the attempt — the agent gets the diff and a round log and continues cold.
4. As the Ralph loop operator, I want a code-review round after the gate passes, so that a separate agent inspects the diff for spec compliance, edge cases, and pattern deviations before a PR is opened.
5. As the Ralph loop operator, I want review findings to trigger review-fix rounds, so that the implementer addresses specific, actionable feedback rather than shipping unreviewed code.
6. As the Ralph loop operator, I want every review-fix to re-run the gate, so that a fix that breaks the build is caught before re-review.
7. As the Ralph loop operator, I want every review-fix to be re-reviewed by the reviewer agent, so that the fix is confirmed to actually address the findings.
8. As the Ralph loop operator, I want e2e projects removed from the gate, so that gate failures are always fixable by the implementer and not caused by environmental e2e issues the agent cannot resolve.
9. As the Ralph loop operator, I want the gate's project list to match the ralph agent's documented project list, so that the agent and the script agree on what "green" means.
10. As the Ralph loop operator, I want a gate-fix cap of 3 rounds, so that a persistently failing gate doesn't burn unlimited tokens.
11. As the Ralph loop operator, I want a review-fix cap of 2 rounds, so that a persistently failing review doesn't cycle forever.
12. As the Ralph loop operator, I want a total round cap of 10, so that any attempt eventually terminates even if gate and review cycling consumes the per-type caps slowly.
13. As the Ralph loop operator, I want crash and no-commits to count as rounds, so that a stuck agent doesn't get unlimited free retries.
14. As the Ralph loop operator, I want a double-failure (session-resume no-commits, then fallback no-commits) to abandon immediately, so that a genuinely stuck agent is detected and reported rather than cycling.
15. As the Ralph loop operator, I want infra failures (git push, gh pr create) to retry and then abandon with a clear comment, so that a transient network blip doesn't silently leave an issue in a stuck state.
16. As the Ralph loop operator, I want per-round timeouts to be tiered (implementation 30m, fix rounds 20m, review 15m), so that stuck fix rounds are detected faster than the heavy implementation round.
17. As the Ralph loop operator, I want the round state machine to be a pure function, so that the flow logic is testable without running any subprocesses.
18. As the Ralph loop operator, I want the reviewer agent to emit a structured `REVIEW_CLEAN` or `REVIEW_FINDINGS:` token, so that the script can deterministically decide whether to open a PR or trigger a review-fix round.
19. As the Ralph loop operator, I want the reviewer agent to receive the issue body and the branch diff, so that its review is grounded in the spec and the actual changes.
20. As the Ralph loop operator, I want the reviewer agent to be a separate agent from the implementer, so that review catches blind spots the implementer had when writing the code.
21. As the Ralph loop operator, I want a round log included in git-state fallback feedback, so that a cold-started agent knows what prior rounds attempted and what their outcomes were.
22. As the Ralph loop operator, I want gate-failure feedback to be structured per-project rather than a 4000-char dump, so that the agent can focus on the specific failing projects.
23. As the Ralph loop operator, I want the implementation round to attach the issue body via a temp file, so that the agent has the full spec even in a cold-start fallback.
24. As the Ralph loop operator, I want the abandon comment to name which cap was hit (gate-fix, review-fix, or total), so that I can diagnose whether the issue was too hard for the gate, too hard for review, or just long.
25. As the Ralph loop operator, I want the ralph agent's system prompt updated to describe the round-based flow, so that the agent knows its work will be reviewed and that fix rounds will follow.
26. As the Ralph loop operator, I want the reviewer agent's system prompt to define the review criteria and the output token contract, so that reviews are consistent and parseable.
27. As the Ralph loop operator, I want the stash-between-iterations behavior removed for retries within an attempt, so that uncommitted progress is not lost when a round fails and the next round continues on the same branch.
28. As the Ralph loop operator, I want the session ID to be reliably captured from the opencode invocation output, so that session resume actually works.
29. As the Ralph loop operator, I want the round count to be tracked uniformly against the total cap, so that `--max-iterations` reflects total work, not just issues started.
30. As the Ralph loop operator, I want the reusable round abstraction to be shared across implementation, gate-fix, and review-fix rounds, so that adding a new improvement round type in the future is a small change.

## Implementation Decisions

### State machine

The attempt loop in `runRalphLoop` is replaced by a round-based state machine. The state machine transitions are extracted into a pure function `nextRoundState(currentState, roundResult) → nextState` that encodes all flow decisions. The state tracks: current round type, session ID, gate-fix rounds used, review-fix rounds used, total rounds used, round log, and whether the last round used fallback. The state machine routes between Implementation, Gate, Gate-Fix, Code-Review, Review-Fix, Open-PR, and Abandon.

The transition rules (from the ADR at `docs/adr/0002-ralph-round-based-flow.md`):

```
ATTEMPT STARTS → Round 1: IMPLEMENTATION
IMPLEMENTATION → new commits → push → GATE
IMPLEMENTATION → crash / no-commits → count round → next round uses fallback
GATE → pass → CODE-REVIEW
GATE → fail → if gate-fix cap (G=3) hit → ABANDON
GATE → fail → else → GATE-FIX ROUND
GATE-FIX → new commits → push → GATE (re-run)
GATE-FIX → crash / no-commits → count round → if was fallback → ABANDON (double-fail)
GATE-FIX → crash / no-commits → else → next round is fallback
CODE-REVIEW → REVIEW_CLEAN → OPEN PR
CODE-REVIEW → REVIEW_FINDINGS → if review-fix cap (R=2) hit → ABANDON
CODE-REVIEW → REVIEW_FINDINGS → else → REVIEW-FIX ROUND
CODE-REVIEW → crash → count round → retry review (reviewer is always cold-start)
REVIEW-FIX → new commits → push → GATE (must re-pass) → CODE-REVIEW (must re-sign-off)
REVIEW-FIX → crash / no-commits → count round → if was fallback → ABANDON (double-fail)
REVIEW-FIX → crash / no-commits → else → next round is fallback
ANY ROUND → total cap (T=10) hit → ABANDON
```

### Round abstraction

Two functions shared across round types:

1. `runImprovementRound({ attempt, feedback, capType, issueBodyFile })` — handles Implementation (feedback=null, fresh session), Gate-Fix (feedback=gate output, cap=gate), and Review-Fix (feedback=findings, cap=review). Performs: continuity (session resume or git-state fallback), invokes the implementer agent, checks for new commits, pushes, counts the cap, returns `{ newCommits, crashed, sessionId, usedFallback }`.

2. `runReviewRound({ issue, branch })` — cold-starts the reviewer agent, parses the `REVIEW_CLEAN` / `REVIEW_FINDINGS:` token from the output, returns `{ clean, findings }`.

The state machine in `runRalphLoop` orchestrates these functions and routes based on their results.

### Session continuity (hybrid)

The session ID capture bug is fixed: `runCmd` must pipe stdout (not inherit stdio) so `parseSessionIdFromTranscript` can parse the session ID from the JSON event stream. Each improvement round attempts `opencode run --session <id>` first. If the session is null, or the round produces no new commits, the next round is a git-state fallback: a fresh `opencode run` (no `--session`) whose feedback includes the issue body (via `--file`), `git diff main...branch`, a round log, and the current round's feedback (gate output or review findings). One session-resume failure triggers fallback; a fallback round that also produces no new commits triggers abandonment (double-failure rule).

### Round log

A structured summary of prior rounds in an attempt, included in git-state fallback feedback. Each entry records: round type (implementation / gate-fix / review-fix / code-review), outcome (crash / no-commits / gate-fail / gate-pass / review-findings / review-clean), and a one-line note. Replaces the lost session context so a cold-started agent can continue coherently.

### Gate scope fix

The `FULL_GATE_PROJECTS` constant is updated to match the ralph agent's documented project list exactly: `mobile`, `admin`, `api`, `domain`, `api-contracts`, `map`, `i18n`, `ui`. The `mobile-e2e` and `api-e2e` projects are removed — e2e is a human-review concern, not an agent gate. Gate failures are now always fixable by the implementer, which the strict state machine assumes.

### Gate feedback structuring

Gate-failure feedback is structured per-project rather than a 4000-char dump. The script parses the nx output to identify which projects and targets (lint / test / build) failed, and presents them as a structured list to the agent. The full output is included as a collapsible reference, but the structured summary is the primary feedback.

### Reviewer agent

A new opencode agent is defined with a review-focused system prompt. The reviewer is cold-started per review round (no shared session with the implementer). It receives: the issue body (via `--file`), `git diff main...branch` (via a temp file or inline), and a prompt defining review criteria (spec compliance, missing edge cases, type safety, test coverage, deviations from patterns in neighboring files). Its final message must end with either `REVIEW_CLEAN` or `REVIEW_FINDINGS:` followed by a numbered list of concrete, fixable findings. The script parses the trailing token. The findings list is relayed verbatim to the implementer as review-fix feedback.

### Caps

Three caps, all counted globally across the attempt: Gate-Fix Cap (G=3), Review-Fix Cap (R=2), Total Cap (T=10). Every round invocation counts against T. Improvement rounds also count against their type cap regardless of outcome — crash and no-commits are not free. Hitting any cap abandons the attempt with a comment naming which cap was hit.

### Per-round timeouts

Tiered: Implementation Round 30 minutes, Gate-Fix and Review-Fix Rounds 20 minutes each, Code-Review Round 15 minutes. Worst-case wall-clock per attempt: ~175 minutes.

### Infra failure handling (F3 fix)

The current behavior (push / `gh pr create` failure logs a message and returns exit 0) is replaced with: retry the infra step up to 3 times with short backoff. If all retries fail, abandon the attempt with a comment naming the infra failure. Never return exit 0 on an infra failure — the issue must not appear "done" to the next run.

### Stash behavior

The current `cleanupBetweenIterations` stashes dirty working tree before checkout. Within an attempt, rounds stay on the same branch — no stash between rounds. The stash-cleanup is only used between issues (after an attempt completes or abandons).

### Iteration counting

`iterationCount` is replaced by the total round counter (counting against T). The `--max-iterations` flag now caps total rounds across all issues in a run, not just issues started. This prevents a single long attempt from running forever under the new flow.

### Agent prompt updates

The ralph agent's system prompt is updated to describe the round-based flow: the agent's work will be reviewed by a separate reviewer agent, fix rounds will follow gate failures and review findings, and the agent should expect structured feedback. The reviewer agent's system prompt defines the review criteria, the input contract (issue body + diff), and the output token contract (`REVIEW_CLEAN` / `REVIEW_FINDINGS:` + numbered list).

### Vocabulary

The ralph-loop domain vocabulary is documented in `scripts/CONTEXT.md` (separate from the IslandHub product domain in `CONTEXT.md`, coordinated via `CONTEXT-MAP.md`). Terms: Attempt, Round, Implementation Round, Gate-Fix Round, Code-Review Round, Review-Fix Round, Improvement Round, Implementer Agent, Reviewer Agent, Session Continuity, Git-state Fallback, Round Log, Round Cap, Gate, REVIEW_CLEAN, REVIEW_FINDINGS.

## Testing Decisions

### What makes a good test

Tests assert external behavior, not implementation details. A good test for the ralph loop answers: "given this round result, does the state machine route to the correct next round?" — not "did the function call `runCmd` with these exact arguments?" Pure logic is tested directly; subprocess-invoking functions are tested via dependency injection of the command runner, mirroring the API's mock-Prisma pattern.

### Primary seam: state machine transitions

The round state machine is extracted into a pure function `nextRoundState(currentState, roundResult) → nextState`. This is the highest seam — the entire flow logic is testable without any subprocess mocking. Test cases cover every transition in the state machine diagram: implementation→gate, gate-pass→review, gate-fail→gate-fix, gate-fix cap hit→abandon, review-clean→pr, review-findings→review-fix, review-fix cap hit→abandon, review-fix→gate→review (strict cycling), double-failure→abandon, total cap→abandon. This is a Vitest test file colocated with the state machine module.

### Secondary seams: pure helpers

Reviewer token parsing (`parseReviewToken(output) → { clean, findings }`), session ID extraction (`parseSessionIdFromTranscript(transcript) → string | null`), and gate output structuring (`structureGateFailure(output) → { failedProjects, summary, fullOutput }`) are pure functions tested directly. These follow the pattern established in `libs/domain/src/lib/*.spec.ts` (Vitest, pure-function tests).

### Round-runner seams: injected command runner

`runImprovementRound` and `runReviewRound` invoke external commands (opencode, git, nx). They are tested with an injected `runCmd` function (dependency injection), following the API's mock-Prisma pattern in `apps/api/src/app/modules/*/*.spec.ts`. Tests verify: the correct opencode arguments are constructed for each round type (session resume vs. fallback, feedback content, issue body attachment), new commits are detected correctly, crashes are detected, and the returned result matches the contract `{ newCommits, crashed, sessionId, usedFallback }`.

### Prior art

- Pure-function Vitest tests: `libs/domain/src/lib/domain.spec.ts`, `libs/domain/src/lib/normalization.spec.ts`
- Mocked-dependency Jest tests: `apps/api/src/app/modules/route-crud/route-crud.service.spec.ts`
- Test runner for the script: Vitest (matching the domain lib pattern, since the script is TypeScript and doesn't need Angular's test setup)

## Out of Scope

- E2E test execution by the agent — e2e remains a human-review concern.
- Running the ralph loop itself in CI — the loop is operator-invoked locally.
- Changing the issue picker (FIFO by issue number, blocker resolution) — the picker is not a source of the reported reliability issues.
- Changing the `reset` subcommand — it remains for manual reclaim of stuck issues.
- Automatic rebase on `main` drift mid-attempt — the attempt stays on the branch it was created from.
- Parallel attempts on multiple issues — the loop remains single-attempt-at-a-time.
- Reviewer agent model selection — uses the same default model as the implementer unless overridden.
- Persistent round state across script restarts — if the script is killed mid-attempt, the next run starts a fresh attempt (the branch is detected as claimed and skipped; `reset` reclaims it).

## Further Notes

- The design decisions are recorded in `docs/adr/0002-ralph-round-based-flow.md`.
- The ralph-loop vocabulary is recorded in `scripts/CONTEXT.md`, separated from the IslandHub product domain via `CONTEXT-MAP.md`.
- The existing `docs/adr/0001-driving-path-interim-provider.md` is unrelated to this PRD (it covers the routing provider, not the agent loop).
- Implementation should verify that `opencode run --session <id>` actually resumes a session reliably before depending on it; if session resume is fundamentally broken in the current opencode version, the hybrid design degrades gracefully to git-state fallback for all rounds.
- The worst-case token cost per attempt is bounded by T=10 rounds. Operators should set `--max-iterations` and `--max-minutes` with this in mind — a single hard issue can consume the entire run budget.
