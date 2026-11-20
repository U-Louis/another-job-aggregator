import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery sends Himalayas search filters", () => {
  const params = buildQuery({
    q: "developer",
    sort: "recent",
    seniority: "Mid-level,Senior",
    worldwide: true,
  })

  const url = new URL(params.url)
  assert.equal(url.origin + url.pathname, "https://himalayas.app/jobs/api/search")
  assert.equal(url.searchParams.get("q"), "developer")
  assert.equal(url.searchParams.get("sort"), "recent")
  assert.equal(url.searchParams.get("seniority"), "Mid-level,Senior")
  assert.equal(url.searchParams.get("worldwide"), "true")
  assert.equal(params.headers?.Accept, "application/json")
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    q: "developer",
    sort: "recent",
    seniority: "Mid-level,Senior",
    worldwide: true,
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })
  const url = new URL(params.url)

  assert.equal(url.searchParams.get("q"), "developer")
  assert.equal(url.searchParams.get("sort"), "recent")
  assert.equal(url.searchParams.get("seniority"), "Mid-level,Senior")
  assert.equal(url.searchParams.get("worldwide"), "true")
  assert.equal(url.searchParams.get("what_or"), null)
  assert.equal(url.searchParams.get("what_or_remote"), null)
  assert.equal(url.searchParams.get("what_exclude_remote"), null)
})
