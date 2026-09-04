# Implementation plan

## Stack

TypeScript (ESM) · Zod · native fetch · `@notionhq/client` · `node:test` · `tsx` · GitHub Actions · Notion (single DB)

## Build loop (per provider)

1. Scaffold core + type-level fetch layer
2. Add conf file for the query profile (`configs/<profile>.yaml`)
3. Run `npm run test-payload -- --conf configs/<profile>.yaml` → save as `payloads/<profile>.json` (gitignored)
4. Implement `schema.ts` + `query.ts` + `adapt.ts` + unit test against fixture
5. Validate full UC: fetch → adapt → filter → dedup → Notion
6. Repeat for next provider / query profile

**v1 entry:** Adzuna (`provider: adzuna`, country `fr`) end-to-end — done.  
**Current loop:** `external-scraper` type via Apify; first provider LinkedIn (`provider: linkedin`).

## Phases

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold TS project: core pipeline, Zod types, conf loader, `.gitignore`, GHA with npm cache | done |
| 2 | `sources/api/` fetch layer + Query Builder + adapter interface + registry | done |
| 3 | `test-payload` CLI for Adzuna payload capture | done |
| 4 | Adzuna adapter (`schema`, `query`, `adapt`) from captured payload + fixture unit test | done |
| 5 | Wire filter, dedup, truncate, Notion sync, error artifact — end-to-end | done |
| 6 | Additional Adzuna query confs + Remotive + RemoteOK API providers | done |
| 7 | `external-scraper` fetch (Apify sync API) + LinkedIn adapter + conf + full UC | pending |
| 8 | Indeed adapter (`provider: indeed`, same Apify fetch layer) | pending |
| 9 | RSS / XHR source types | pending |

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
