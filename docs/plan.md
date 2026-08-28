# Implementation plan

## Stack

TypeScript (ESM) · Zod · native fetch · `@notionhq/client` · `node:test` · `tsx` · GitHub Actions · Notion (single DB)

## Build loop (per provider)

1. Scaffold core + type-level fetch layer
2. Add conf file for the query profile (`configs/<profile>.yaml`)
3. Run `npm run test-payload -- --conf configs/<profile>.yaml` → save as `src/sources/api/<provider>/fixtures/<profile>.json`
4. Implement `schema.ts` + `query.ts` + `adapt.ts` + unit test against fixture
5. Validate full UC: fetch → adapt → filter → dedup → Notion
6. Repeat for next provider / query profile

**v1 entry:** Adzuna (`provider: adzuna`, country `fr`) end-to-end before RSS / XHR / external-scraper.

## Phases

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold TS project: core pipeline, Zod types, conf loader, `.gitignore`, GHA with npm cache | pending |
| 2 | `sources/api/` fetch layer + Query Builder + adapter interface + registry | pending |
| 3 | `test-payload` CLI for Adzuna payload capture | pending |
| 4 | Adzuna adapter (`schema`, `query`, `adapt`) from captured payload + fixture unit test | pending |
| 5 | Wire filter, dedup, truncate, Notion sync, error artifact — end-to-end | pending |
| 6 | Additional Adzuna query confs, then remaining API providers, then other types | pending |

## Unit tests (hand-run, no CI gate)

- `adapt(fixture)` — field mapping, salary format, HTML stripping, remote enum, `publishedAt` ISO 8601, company fallback with URL hash
- `buildQuery(confQuery)` — fetch params (Adzuna URL, query string)
- `applyForbiddenFilter()` — title exclusion
- `dedup()` — `normalize(title) | normalize(company)` collapse
- `truncateDescription()` — 1900 char hard slice + `…`

## `.gitignore`

```
node_modules/  dist/  .env  .env.local  *.log  .DS_Store  coverage/  .cache/
```

## Constraints

- Git: handled manually, agent does not commit/push unless asked
- No JSON run artifacts — in-memory sync only
- Errors non-blocking; artifact upload only if log non-empty
- One conf file per query profile; `aggregate.yml` matrix over `configs/*.yaml`
