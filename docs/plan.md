# Implementation plan

## Stack

TypeScript · Zod · native fetch · `@notionhq/client` · GitHub Actions · Notion (single DB)

## Build loop (per source)

1. Scaffold core + type-level fetch layer
2. Register source in conf
3. Run **test-payload** action → save artifact as `fixtures/sample.json`
4. Implement `query.ts` + `adapt.ts` + unit test against fixture
5. Validate full UC: fetch → adapt → filter → dedup → Notion
6. Repeat for next source

**v1 entry:** one API source end-to-end before RSS / XHR / external-scraper.

## Phases

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold TS project: core pipeline, Zod types, conf, `.gitignore`, GHA with npm cache | pending |
| 2 | `sources/api/` fetch + Query Builder + pre-fetch adapter pattern | pending |
| 3 | `test-payload.yml` workflow for first API source | pending |
| 4 | First API adapter from captured payload + fixture unit test | pending |
| 5 | Wire filter, dedup, truncate, Notion sync, error artifact — end-to-end | pending |
| 6 | Loop remaining API sources, then other types | pending |

## Unit tests (hand-run, no CI gate)

- `adapt(fixture)` — field mapping, remote enum
- `query(confQuery)` — fetch params
- `applyForbiddenFilter()` — title exclusion
- `dedup()` — title + company + source collapse
- `truncateDescription()` — 1900 char limit

## `.gitignore`

```
node_modules/  dist/  .env  .env.local  *.log  .DS_Store  coverage/  .cache/
```

## Constraints

- Git: handled manually, agent does not commit/push unless asked
- No JSON run artifacts — in-memory sync only
- Errors non-blocking; artifact upload only if log non-empty
