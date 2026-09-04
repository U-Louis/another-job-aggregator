import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery builds the Remotive API URL with filters", () => {
  const params = buildQuery({
    search: "typescript",
    category: "software-dev",
    company_name: "remotive",
    limit: 25,
  })

  const url = new URL(params.url)
  assert.equal(url.origin + url.pathname, "https://remotive.com/api/remote-jobs")
  assert.equal(url.searchParams.get("search"), "typescript")
  assert.equal(url.searchParams.get("category"), "software-dev")
  assert.equal(url.searchParams.get("company_name"), "remotive")
  assert.equal(url.searchParams.get("limit"), "25")
})

test("buildQuery omits optional filters when absent", () => {
  const params = buildQuery({})
  const url = new URL(params.url)

  assert.equal(url.origin + url.pathname, "https://remotive.com/api/remote-jobs")
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

test("buildQuery rejects invalid limit", () => {
  assert.throws(
    () => buildQuery({ limit: 0 }),
    /Number must be greater than 0/,
  )
})
