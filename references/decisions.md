# Decisions, states, and authorizations

Two dimensions separated per variant revision, plus the opportunity state. A preference can remain valid while implementation is blocked.

## A. User decision (per revision)

| `jiu` value | Meaning | Who sets it |
|---|---|---|
| `undecided` | undecided | default; every new revision starts here |
| `preview` | selected for preview | user |
| `rejected` | rejected | user (chat or lab) |
| `deferred` | deferred | user (chat or lab) |
| `implement` | chosen for implementation | user, only through the chat with the controller |

In addition, `preferred: true` records "I prefer this one" coming from the lab. It is a signal for the conversation, not an authorization.

## B. Work state (per revision)

`proposed` → `mock-building` → `mock-ready` → `review-requested` → `implementing` → `implemented` → `verified`, plus `blocked` and `stale` from any point.

| To | Requires |
|---|---|
| `mock-building` | decision `preview` or `implement` on this revision |
| `mock-ready` | preview recorded (`preview-set`) |
| `review-requested` | `mock-ready` or `implemented` |
| `implementing` | decision `implement` on this exact revision |
| `implemented` | `implementing` (completed tasks do this on their own) |
| `verified` | `implemented`/`review-requested` with decision `implement`, and evidence |
| `blocked` | evidence of the blocker |
| `proposed` | only from `blocked` or `stale` |

## Opportunity

`open` · `deferred` (the whole opportunity deferred) · `dismissed` (discarded) · `closed` (resolved, including "keep original").

`decide R O-03 keep-original` marks `V0/r1` as chosen and verified with no change, and closes the opportunity. The other variants remain in the history.

## Authorizations

| Authorization | How it is recorded | Does not authorize |
|---|---|---|
| Preview | `decide R O-01/V2/r1 preview --quote` | any change to the target; other variants; final paid media |
| Implementation | `decide R O-01/V2/r3 implement --quote` | other opportunities; other revisions; uncited dependencies; publishing |
| Publishing | `set R authorizations.publish true --quote` (with the scope in the quoted text) | items beyond the cited scope |
| Paid media | `set R authorizations.media.authorized true --quote` + `limit` | spending above the limit; generating without a claim |

The quote (`--quote`) is the user's text that grounds the decision. Do not invent it or paraphrase it into something stronger.

## Translating remarks into commands

| Remark | Command(s) |
|---|---|
| "Create mocks of O-01/V2 and O-03/V1. Do not change the target." | `decide R O-01/V2/r<latest> preview` and `decide R O-03/V1/r<latest> preview`; then E4 |
| "I want to see the second option for O-01" | Resolve: "second option" = V2? (V1 is the first alternative; V0 is the original). If the presentation numbered them differently, use the table the user saw. Ambiguous → ask, showing the refs |
| "On O-01 I liked V2 but reduce the motion" | Feedback `adjust` on O-01/V2/r<n> → lab generates `variant-revise` r<n+1> → the new revision needs `preview` to get a mock; ask whether you can already create the mock for the new revision, or treat "reduce" as an explicit request for a new demonstration when the context is the lab |
| "On O-03, keep the original" | `decide R O-03 keep-original` |
| "Implement O-01/V2 r3; leave the others pending" | `decide R O-01/V2/r3 implement`; no other decision changes |
| "Implement the one I liked" | List the revisions marked `preferred`/`preview` and ask for the exact ref |
| "Implement everything I approved" | List the revisions with `preview`/`preferred` and confirm the exact list before recording `implement` on each |
| "Reject V1" (no revision given) | Use the revision the user saw (the latest with a mock, or the latest presented), and say which one you recorded |
| "Drop O-02" | `decide R O-02 dismissed` |
| "I'll look at O-04 later" | `decide R O-04 deferred` |
| "Generate more options for O-01" | E3 only for O-01: new variants V3…; existing decisions untouched |

## Consistency rules

- One `implement` revision per opportunity; switching requires `--replace` and the user asking for the switch.
- `implement` on a `stale` revision is refused: revalidate or create a new revision.
- Choosing a revision that is not the latest is allowed when the user asks for exactly that one; `jiu` warns.
- The lab may record `rejected`/`deferred`, but never revokes an `implement`; that goes back to the chat.
- A change of decision is recorded as a new line in `decisions.jsonl`; nothing is rewritten.
