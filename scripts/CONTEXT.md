# Ralph Loop Vocabulary

Canonical definitions for the autonomous agent driver in `scripts/ralph.ts`. These terms describe the loop's state machine and its contracts with the agents it invokes. Prefer these terms in the script, agent prompts, issue comments, and ADRs.

## Lifecycle

### Attempt
The outer container for working one issue. An attempt owns one issue, one branch (`agent/issue-<N>`), and one session lineage. An attempt ends when a PR is opened, the round cap is exhausted, or the issue is abandoned. Distinct from a Round — an attempt contains many rounds.

### Round
A single `opencode run` invocation within an attempt, with a specific purpose. Every round belongs to exactly one attempt and resumes (or falls back from) the previous round's session. The round types are: Implementation Round, Gate-Fix Round, Code-Review Round, Review-Fix Round.

### Implementation Round
The first round of an attempt. The implementer agent (Ralph) reads the issue body and implements the smallest change that satisfies it, from a fresh session. Always round 1.

### Gate-Fix Round
An Improvement Round triggered by a failed Gate. The implementer agent receives the gate output and fixes the failures. After a gate-fix, the Gate re-runs. The strict state machine re-reviews after every gate-fix that follows a review-fix.

### Code-Review Round
A round where a separate Reviewer Agent inspects the branch's diff against the issue spec and emits a `REVIEW_CLEAN` or `REVIEW_FINDINGS:` token. The reviewer is a cold-start invocation — it shares no session with the implementer. A code-review round only runs after the Gate passes.

### Review-Fix Round
An Improvement Round triggered by `REVIEW_FINDINGS`. The implementer agent receives the findings list and fixes them. After a review-fix, the Gate re-runs (must re-pass), then a Code-Review Round re-runs. This is the strict loop: every review-fix re-proves the gate and re-earns review sign-off.

### Improvement Round
A round whose purpose is to fix feedback from a prior round. Gate-Fix and Review-Fix Rounds are improvement rounds. The reusable round runner treats them uniformly: same continuity mechanism, same commit-and-push contract, same "did it produce new work?" check.

## Agents

### Implementer Agent
The opencode agent (`ralph`) that implements the issue and fixes feedback across rounds. Owns the session lineage within an attempt.

### Reviewer Agent
A separate opencode agent (distinct from the implementer) that performs Code-Review Rounds. Cold-started per review round — no shared session with the implementer. Reads the diff, the issue body, and domain docs; emits a structured review token.

## Mechanisms

### Session Continuity
How a round resumes the previous round's context. Hybrid: the script attempts `opencode run --session <id>` first; if the session is missing or the round produces no new commits, the next round falls back to a Git-state Fallback.

### Git-state Fallback
The cold-start continuity mode used when session resume fails or produces no new commits. The fallback round is a fresh `opencode run` (no `--session`) whose feedback includes: the issue body (via `--file`), `git diff main...branch`, a Round Log, and the current round's feedback (gate output or review findings). One session-resume failure triggers fallback; a fallback round that also produces no new commits triggers abandonment.

### Round Log
A structured summary of prior rounds in an attempt, included in Git-state Fallback feedback. Each entry records the round type, outcome (crash / no-commits / gate-fail / gate-pass / review-findings / review-clean), and a one-line note. Replaces the lost session context so a cold-start agent can continue coherently.

### Round Cap
The limit on rounds per attempt. Three caps, all counted globally across the attempt: Gate-Fix Cap (G, default 3), Review-Fix Cap (R, default 2), Total Cap (T, default 10). Hitting any cap abandons the attempt with a comment naming which cap was hit. Every round invocation counts against T; improvement rounds also count against their type cap regardless of outcome (crash and no-commits are not free).

### Gate
The full-scope verification run: `npx nx run-many -t lint,test,build -p <projects>`. Runs after the Implementation Round and after every Improvement Round. A round is only eligible for Code-Review after the Gate passes.

### REVIEW_CLEAN
The token the Reviewer Agent emits when the diff has no actionable findings. Terminates the review loop → the script opens a PR.

### REVIEW_FINDINGS
The token the Reviewer Agent emits when the diff has actionable issues. Followed by a numbered list of concrete, fixable findings. The script relays the list verbatim to the implementer as Review-Fix Round feedback.
