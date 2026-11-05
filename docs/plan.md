# Implementation plan

## Stack

TypeScript (ESM) · Zod · native fetch · `@notionhq/client` · `node:test` · `tsx` · GitHub Actions · Notion (single DB)

## Build loop (per provider)

1. Scaffold core + type-level fetch layer
2. Add conf file for the query profile (`configs/search/<profile>.yaml`)
3. Run `npm run test-payload -- --conf configs/search/<profile>.yaml` → save as `payloads/<profile>.json` (gitignored)
4. Implement `schema.ts` + `query.ts` + `adapt.ts` + unit test against fixture
5. Validate full UC: fetch → adapt → filter → dedup → Notion
6. Repeat for next provider / query profile

**v1 entry:** Adzuna (`provider: adzuna`, country `fr`) end-to-end — done.  
**Current loop:** `external-scraper` type via Bright Data; first provider LinkedIn (`provider: linkedin`).

## Phases

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold TS project: core pipeline, Zod types, conf loader, `.gitignore`, GHA with npm cache | done |
| 2 | `sources/api/` fetch layer + Query Builder + adapter interface + registry | done |
| 3 | `test-payload` CLI for Adzuna payload capture | done |
| 4 | Adzuna adapter (`schema`, `query`, `adapt`) from captured payload + fixture unit test | done |
| 5 | Wire filter, dedup, truncate, Notion sync, error artifact — end-to-end | done |
| 6 | Additional Adzuna query confs + Remotive + RemoteOK API providers | done |
| 7 | `external-scraper` fetch (Bright Data API) + LinkedIn adapter + conf + full UC | done |
| 8 | Indeed adapter (`provider: indeed`, same Bright Data fetch layer) | pending |
| 9 | RSS fetch layer + We Work Remotely provider | done |
| 10 | Review new Notion cards from `configs/agents/review-rules.yaml` | done |
| 11 | Trash archived Notion pages older than 30 days, in parallel with review | done |

## Unit tests (hand-run, no CI gate)

- `adapt(fixture)` — field mapping, salary format, HTML stripping, remote enum, `publishedAt` ISO 8601, company fallback with URL hash
- `buildQuery(confQuery)` — fetch params (Adzuna URL, query string)
- `applyForbiddenFilter()` — title exclusion
- `dedup()` — `normalize(title) | normalize(company)` collapse
- `truncateDescription()` — 1900 char hard slice + `…`
- `reviewCreatedPages()` — matching rule comments then archives; no match and failures leave Status empty
- `deleteStalePages()` — trash Status `archived` pages whose `created_time` is more than 30 days ago; leave every other status and newer pages; keep going when one delete fails

## `.gitignore`

```
node_modules/  dist/  .env  .env.local  *.log  .DS_Store  coverage/  .cache/
```

## Constraints

- Git: handled manually, agent does not commit/push unless asked
- No persisted JSON dumps of fetched offers. The review job receives only the pages created in that run, as a workflow artifact
- Errors non-blocking; artifact upload only if log non-empty
- One conf file per query profile; `aggregate.yml` matrix over `configs/search/*.yaml`
