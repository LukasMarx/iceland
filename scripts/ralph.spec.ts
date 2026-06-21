import { describe, it, expect } from 'vitest';
import {
  parseReviewToken,
  parseSessionIdFromTranscript,
  structureGateFailure,
  buildRoundLog,
  createInitialState,
  nextAttemptState,
  nextAfterGate,
  type AttemptState,
  type ImprovementRoundResult,
  type ReviewRoundResult,
  type RoundLogEntry,
} from './ralph';

// ─── parseReviewToken ─────────────────────────────────────────────────────

describe('parseReviewToken', () => {
  it('returns clean for REVIEW_CLEAN', () => {
    expect(parseReviewToken('some review text\nREVIEW_CLEAN')).toEqual({ clean: true, findings: null });
  });

  it('returns findings for REVIEW_FINDINGS:', () => {
    const output = `some review text
REVIEW_FINDINGS:
1. File.ts:10 — Missing null check
2. Other.ts:5 — Uses any type`;
    const result = parseReviewToken(output);
    expect(result.clean).toBe(false);
    expect(result.findings).toContain('1. File.ts:10');
    expect(result.findings).toContain('2. Other.ts:5');
  });

  it('returns neither when no token present', () => {
    expect(parseReviewToken('just some text')).toEqual({ clean: false, findings: null });
  });

  it('handles REVIEW_CLEAN with trailing whitespace', () => {
    expect(parseReviewToken('REVIEW_CLEAN  \n  ')).toEqual({ clean: true, findings: null });
  });

  it('handles REVIEW_FINDINGS with empty findings list', () => {
    const result = parseReviewToken('REVIEW_FINDINGS:\n');
    expect(result.clean).toBe(false);
    expect(result.findings).toBe('');
  });
});

// ─── parseSessionIdFromTranscript ──────────────────────────────────────────

describe('parseSessionIdFromTranscript', () => {
  it('extracts sessionID from JSON event line', () => {
    const transcript = `some text
{"sessionID":"ses_abc123","type":"init"}
more text`;
    expect(parseSessionIdFromTranscript(transcript)).toBe('ses_abc123');
  });

  it('returns null when no JSON lines present', () => {
    expect(parseSessionIdFromTranscript('plain text\nno json here')).toBeNull();
  });

  it('skips non-JSON lines starting with {', () => {
    const transcript = `{not valid json}
{"sessionID":"ses_xyz"}`;
    expect(parseSessionIdFromTranscript(transcript)).toBe('ses_xyz');
  });

  it('returns the first sessionID found', () => {
    const transcript = `{"sessionID":"ses_first"}
{"sessionID":"ses_second"}`;
    expect(parseSessionIdFromTranscript(transcript)).toBe('ses_first');
  });

  it('returns null for empty transcript', () => {
    expect(parseSessionIdFromTranscript('')).toBeNull();
  });
});

// ─── structureGateFailure ──────────────────────────────────────────────────

describe('structureGateFailure', () => {
  it('extracts failed projects from nx output', () => {
    const output = `> NX Running target build for project api
Failed api:build
> NX Running target lint for project domain
Failed domain:lint`;
    const result = structureGateFailure(output);
    expect(result.failedProjects.length).toBeGreaterThanOrEqual(1);
    expect(result.summary).toBeTruthy();
  });

  it('returns unknown summary when no failures parsed', () => {
    const result = structureGateFailure('some random output');
    expect(result.failedProjects).toEqual([]);
    expect(result.summary).toContain('Unknown failures');
  });

  it('preserves full output', () => {
    const output = 'line1\nline2\nline3';
    const result = structureGateFailure(output);
    expect(result.fullOutput).toBe(output);
  });
});

// ─── buildRoundLog ─────────────────────────────────────────────────────────

describe('buildRoundLog', () => {
  it('returns placeholder for empty log', () => {
    expect(buildRoundLog([])).toBe('(no prior rounds)');
  });

  it('formats entries with round numbers', () => {
    const log: RoundLogEntry[] = [
      { type: 'implementation', outcome: 'gate-pass', note: 'new commits pushed' },
      { type: 'gate', outcome: 'gate-fail', note: 'gate failed' },
    ];
    const result = buildRoundLog(log);
    expect(result).toContain('Round 1');
    expect(result).toContain('Round 2');
    expect(result).toContain('implementation');
    expect(result).toContain('gate-fail');
  });
});

// ─── State machine: createInitialState ─────────────────────────────────────

describe('createInitialState', () => {
  it('starts in implementation phase with zeroed counters', () => {
    const s = createInitialState();
    expect(s.phase).toBe('implementation');
    expect(s.sessionId).toBeNull();
    expect(s.gateFixUsed).toBe(0);
    expect(s.reviewFixUsed).toBe(0);
    expect(s.totalRounds).toBe(0);
    expect(s.roundLog).toEqual([]);
    expect(s.usedFallback).toBe(false);
    expect(s.gateFeedback).toBeNull();
    expect(s.reviewFindings).toBeNull();
    expect(s.abandonReason).toBeNull();
  });
});

// ─── State machine: nextAttemptState (improvement round results) ───────────

describe('nextAttemptState — improvement rounds', () => {
  const okResult: ImprovementRoundResult = {
    newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
    exitCode: 0, stdout: '', stderr: '',
  };
  const crashResult: ImprovementRoundResult = {
    newCommits: false, crashed: true, sessionId: null, usedFallback: false,
    exitCode: 1, stdout: '', stderr: 'error',
  };
  const noCommitsResult: ImprovementRoundResult = {
    newCommits: false, crashed: false, sessionId: 'ses_2', usedFallback: false,
    exitCode: 0, stdout: '', stderr: '',
  };

  it('implementation with commits → gate', () => {
    const s = nextAttemptState(createInitialState(), okResult);
    expect(s.phase).toBe('gate');
    expect(s.totalRounds).toBe(1);
    expect(s.sessionId).toBe('ses_1');
    expect(s.usedFallback).toBe(false);
  });

  it('implementation crash → stays implementation (next uses fallback)', () => {
    const s = nextAttemptState(createInitialState(), crashResult);
    expect(s.phase).toBe('implementation');
    expect(s.totalRounds).toBe(1);
    expect(s.usedFallback).toBe(true);
  });

  it('implementation no-commits → stays implementation (next uses fallback)', () => {
    const s = nextAttemptState(createInitialState(), noCommitsResult);
    expect(s.phase).toBe('implementation');
    expect(s.totalRounds).toBe(1);
    expect(s.usedFallback).toBe(true);
  });

  it('double failure (fallback + no-commits) → abandon', () => {
    const first = nextAttemptState(createInitialState(), noCommitsResult);
    expect(first.usedFallback).toBe(true);
    const second = nextAttemptState(first, { ...noCommitsResult, usedFallback: true });
    expect(second.phase).toBe('abandon');
    expect(second.abandonReason).toContain('Double failure');
  });

  it('double failure (fallback + crash) → abandon', () => {
    const first = nextAttemptState(createInitialState(), crashResult);
    const second = nextAttemptState(first, { ...crashResult, usedFallback: true });
    expect(second.phase).toBe('abandon');
    expect(second.abandonReason).toContain('Double failure');
  });

  it('gate-fix with commits → gate', () => {
    const state: AttemptState = {
      ...createInitialState(),
      phase: 'gate-fix',
      gateFixUsed: 1,
      gateFeedback: 'some failure',
    };
    const s = nextAttemptState(state, okResult);
    expect(s.phase).toBe('gate');
    expect(s.totalRounds).toBe(1);
    expect(s.usedFallback).toBe(false);
  });

  it('review-fix with commits → gate (strict cycling)', () => {
    const state: AttemptState = {
      ...createInitialState(),
      phase: 'review-fix',
      reviewFixUsed: 1,
      reviewFindings: '1. Fix something',
    };
    const s = nextAttemptState(state, okResult);
    expect(s.phase).toBe('gate');
    expect(s.totalRounds).toBe(1);
  });

  it('total cap hit → abandon', () => {
    const state: AttemptState = {
      ...createInitialState(),
      totalRounds: 9,
    };
    const s = nextAttemptState(state, okResult);
    expect(s.phase).toBe('abandon');
    expect(s.abandonReason).toContain('Total round cap');
  });
});

// ─── State machine: nextAttemptState (review round results) ────────────────

describe('nextAttemptState — review rounds', () => {
  const cleanResult: ReviewRoundResult = {
    clean: true, findings: null, crashed: false, output: 'REVIEW_CLEAN',
  };
  const findingsResult: ReviewRoundResult = {
    clean: false, findings: '1. Fix X', crashed: false, output: 'REVIEW_FINDINGS:\n1. Fix X',
  };
  const crashResult: ReviewRoundResult = {
    clean: false, findings: null, crashed: true, output: '',
  };

  it('review clean → open-pr', () => {
    const state: AttemptState = { ...createInitialState(), phase: 'code-review' };
    const s = nextAttemptState(state, cleanResult);
    expect(s.phase).toBe('open-pr');
  });

  it('review findings → review-fix', () => {
    const state: AttemptState = { ...createInitialState(), phase: 'code-review' };
    const s = nextAttemptState(state, findingsResult);
    expect(s.phase).toBe('review-fix');
    expect(s.reviewFixUsed).toBe(1);
    expect(s.reviewFindings).toBe('1. Fix X');
  });

  it('review crash → retry code-review (no round counted)', () => {
    const state: AttemptState = { ...createInitialState(), phase: 'code-review' };
    const s = nextAttemptState(state, crashResult);
    expect(s.phase).toBe('code-review');
    expect(s.totalRounds).toBe(0);
  });

  it('review-fix cap hit → abandon', () => {
    const state: AttemptState = {
      ...createInitialState(),
      phase: 'code-review',
      reviewFixUsed: 2,
    };
    const s = nextAttemptState(state, findingsResult);
    expect(s.phase).toBe('abandon');
    expect(s.abandonReason).toContain('Review-fix cap');
  });
});

// ─── State machine: nextAfterGate ──────────────────────────────────────────

describe('nextAfterGate', () => {
  const passResult = { exitCode: 0, stdout: '', stderr: '', sessionId: null, transcript: '' };
  const failResult = { exitCode: 1, stdout: 'FAIL', stderr: 'errors', sessionId: null, transcript: '' };

  it('gate pass → code-review', () => {
    const state: AttemptState = { ...createInitialState(), phase: 'gate' };
    const s = nextAfterGate(state, passResult);
    expect(s.phase).toBe('code-review');
    expect(s.gateFixUsed).toBe(0);
  });

  it('gate fail → gate-fix', () => {
    const state: AttemptState = { ...createInitialState(), phase: 'gate' };
    const s = nextAfterGate(state, failResult);
    expect(s.phase).toBe('gate-fix');
    expect(s.gateFixUsed).toBe(1);
    expect(s.gateFeedback).toContain('FAIL');
  });

  it('gate-fix cap hit → abandon', () => {
    const state: AttemptState = {
      ...createInitialState(),
      phase: 'gate',
      gateFixUsed: 3,
    };
    const s = nextAfterGate(state, failResult);
    expect(s.phase).toBe('abandon');
    expect(s.abandonReason).toContain('Gate-fix cap');
  });

  it('total round cap hit at gate → abandon', () => {
    const state: AttemptState = {
      ...createInitialState(),
      phase: 'gate',
      totalRounds: 10,
    };
    const s = nextAfterGate(state, failResult);
    expect(s.phase).toBe('abandon');
    expect(s.abandonReason).toContain('Total round cap');
  });
});

// ─── Full flow integration (state machine only, no subprocesses) ───────────

describe('full flow — happy path', () => {
  it('implementation → gate pass → review clean → open-pr', () => {
    let s = createInitialState();
    expect(s.phase).toBe('implementation');

    const implResult: ImprovementRoundResult = {
      newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
      exitCode: 0, stdout: '', stderr: '',
    };
    s = nextAttemptState(s, implResult);
    expect(s.phase).toBe('gate');

    const gatePass = { exitCode: 0, stdout: '', stderr: '', sessionId: null, transcript: '' };
    s = nextAfterGate(s, gatePass);
    expect(s.phase).toBe('code-review');

    const reviewClean: ReviewRoundResult = {
      clean: true, findings: null, crashed: false, output: 'REVIEW_CLEAN',
    };
    s = nextAttemptState(s, reviewClean);
    expect(s.phase).toBe('open-pr');
    expect(s.totalRounds).toBe(1);
  });
});

describe('full flow — gate fail then fix', () => {
  it('implementation → gate fail → gate-fix → gate pass → review clean → open-pr', () => {
    let s = createInitialState();

    s = nextAttemptState(s, {
      newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
      exitCode: 0, stdout: '', stderr: '',
    });
    expect(s.phase).toBe('gate');

    s = nextAfterGate(s, { exitCode: 1, stdout: 'FAIL', stderr: '', sessionId: null, transcript: '' });
    expect(s.phase).toBe('gate-fix');
    expect(s.gateFixUsed).toBe(1);

    s = nextAttemptState(s, {
      newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
      exitCode: 0, stdout: '', stderr: '',
    });
    expect(s.phase).toBe('gate');
    expect(s.totalRounds).toBe(2);

    s = nextAfterGate(s, { exitCode: 0, stdout: '', stderr: '', sessionId: null, transcript: '' });
    expect(s.phase).toBe('code-review');

    s = nextAttemptState(s, { clean: true, findings: null, crashed: false, output: 'REVIEW_CLEAN' });
    expect(s.phase).toBe('open-pr');
  });
});

describe('full flow — review findings then fix (strict cycling)', () => {
  it('review-fix → gate → review (must re-pass both)', () => {
    let s = createInitialState();

    s = nextAttemptState(s, {
      newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
      exitCode: 0, stdout: '', stderr: '',
    });
    s = nextAfterGate(s, { exitCode: 0, stdout: '', stderr: '', sessionId: null, transcript: '' });
    s = nextAttemptState(s, { clean: false, findings: '1. Fix X', crashed: false, output: '' });
    expect(s.phase).toBe('review-fix');

    s = nextAttemptState(s, {
      newCommits: true, crashed: false, sessionId: 'ses_1', usedFallback: false,
      exitCode: 0, stdout: '', stderr: '',
    });
    expect(s.phase).toBe('gate');

    s = nextAfterGate(s, { exitCode: 0, stdout: '', stderr: '', sessionId: null, transcript: '' });
    expect(s.phase).toBe('code-review');

    s = nextAttemptState(s, { clean: true, findings: null, crashed: false, output: 'REVIEW_CLEAN' });
    expect(s.phase).toBe('open-pr');
    expect(s.reviewFixUsed).toBe(1);
    expect(s.totalRounds).toBe(2);
  });
});
