# Acceptance scenarios

The central acceptance test: the user tries options, chooses per item, and continues in the same workflow without losing decisions or inadvertently changing the target.

The state rules of each scenario marked with ✱ have automated tests in `scripts/jiu.test.mjs` (`node --test scripts/jiu.test.mjs`). The others are controller behavior: run them in a new session with a test site and check the expected result.

| # | Scenario | How to trigger | Expected |
|---|---|---|---|
| 1 | URL only ✱ | `/juice-it-up https://public-site.com` | `url` mode; inferences marked; snapshot recorded; independent mocks with declared differences; `implement` refused; delivery offered as a package |
| 2 | Code only | `/juice-it-up ./my-site` | stack and tokens detected; attempt to run locally; if it does not render, blocker recorded and visual conclusions separated |
| 3 | URL and code | both | published × local divergences listed before proposing; proposals linked to a commit |
| 4 | Resume in another session ✱ | new session: "resume R-001" | reads the state before acting; does not redo recon/diagnostics; `next` guides; earlier decisions preserved |
| 5 | Mock approval without implementation ✱ | "create a mock of O-01/V2, do not change anything" | only `preview`; target untouched (`git status` clean); attempt to implement is refused |
| 6 | Partial implementation ✱ | "implement O-01/V2 r3; leave the rest" | only tasks for that ref; other opportunities with no decision change |
| 7 | Code change after the mock ✱ | edit a file on the surface and resume | `check-stale` marks only the affected opportunity; `implement` refused until revalidated |
| 8 | Subagent failure | worker with no output file | controller does not invent a result; re-dispatches, runs sequentially, or marks `blocked` |
| 9 | Missing artifact ✱ | delete `proposals/O-02/V1/r1.md` | `validate` flags it; controller handles it before proceeding |
| 10 | Duplicate paid generation ✱ | repeat "generate the hero video" | `media claim` returns `EXISTS` or `IN_PROGRESS`; no second charge |
| 11 | Conflict between proposals | choose O-01/V1 and O-03/V2 in the same fold | composition in the lab with the conflict highlighted; user decides |
| 12 | New round preserves choices ✱ | "more options for O-01" after decisions | new variants V3…; earlier decisions and mocks intact; new revision does not inherit approval |
| 13 | No subagent tool | environment without Agent | warning to the user; named sequential passes; `--self` reviews, never called independent |
| 14 | Tasks on the same file ✱ | two choices touching the same CSS | `task start` refuses the second until the first finishes |
| 15 | Feedback in the lab ✱ | "I prefer this" + "request adjustment" in the harness | events validated; preference does not authorize; adjustment becomes a new revision |
| 16 | Publishing | "deploy it" without prior authorization | controller confirms scope and records authorization before publishing |
| 17 | No proactive seasonal work ✱ | a normal analysis of a toy store in December | no seasonal ideas in E2/E3; at most the one-line offer once per run; the seasonal sub-skill is not read; `opp-add --kind seasonal` refused without `seasonal.requested` |
| 18 | Seasonal on request ✱ | "I'd like a Santa hat on the logo and something for Halloween" | `seasonal.requested` recorded with the quote; occasions recorded; static and animated variants per idea plus V0; own limit (`maxSeasonalOpportunities`) |
| 19 | Seasonal outside the window | implemented Halloween decoration, checked in March | zero DOM and zero network for the decoration; off-date preview shows it; kill switch works |
