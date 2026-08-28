# Agent operating guide

## Docs

| File | Answers | Wins on |
|---|---|---|
| `docs/adr/architecture.md` | What to build — pipeline, data model, Notion schema, routing rule | design conflicts |
| `docs/plan.md` | When/how to build it — stack, per-source build loop, phase table | sequencing conflicts |

Read both before touching code. If they conflict, architecture.md is authoritative for design, plan.md for order of operations.

## Start of session

1. Open `plan.md` → **Phases** table → first row still `pending`. That's the current task.
2. Re-read only the architecture.md section(s) relevant to that phase.
3. If the phase's prerequisites aren't actually done (e.g. its inputs come from a phase still marked pending), stop and flag it rather than reordering silently or improvising the missing piece.

## Keep `plan.md` current

The phase table is the only persistent state across sessions. When you finish a task, update its `Status` cell in the same edit (`pending` → `in progress` / `done`). Don't let the table drift from reality — a future session trusts it at face value.

## Adding a source

Follow the build loop in plan.md in order, without skipping steps to save time — in particular, don't write `query.ts`/`adapt.ts` against an imagined payload shape; wait for the real fixture from the `test-payload` CLI run.

If a new source doesn't cleanly map to RSS / API / XHR / ExternalScraper, stop and ask instead of forcing it into the closest type.

## Scope edges

Architecture.md's "Out of scope" list is deliberate, not incidental. If a task seems to require one of those (JSON artifacts, stale-job cleanup, direct scraping, email parsing, a CI gate), that's a signal to ask the user, not to quietly build a workaround.

## Verification

After implementing a source's `query.ts`/`adapt.ts`, run its unit tests against the captured fixture before starting the next source. Don't chain several unverified sources together.

## Secrets & payloads

- Never commit `.env`, real tokens, or captured API payloads under `payloads/` (gitignored; may contain account-specific redirect URLs).
- A new source needing credentials gets its secret **name** added to the conf/workflow — never a value, never printed to logs or chat.

## Git

Manual only — don't commit or push without an explicit instruction in the session.