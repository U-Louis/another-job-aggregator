import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery builds the Remote OK API URL with tags", () => {
  const params = buildQuery({ tags: "dev,typescript" })

  const url = new URL(params.url)
  assert.equal(url.origin + url.pathname, "https://remoteok.com/api")
  assert.equal(url.searchParams.get("tags"), "dev,typescript")
  assert.ok(params.headers?.["User-Agent"]?.includes("another-job-aggregator"))
})

test("buildQuery omits tags when absent", () => {
  const params = buildQuery({})
  const url = new URL(params.url)

  assert.equal(url.origin + url.pathname, "https://remoteok.com/api")
  assert.equal(url.search, "")
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })
  const url = new URL(params.url)

  assert.equal(url.searchParams.get("what_or"), null)
  assert.equal(url.searchParams.get("what_or_remote"), null)
  assert.equal(url.searchParams.get("what_exclude_remote"), null)
})
