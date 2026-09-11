import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery points at the HN Algolia search endpoint", () => {
  const params = buildQuery({})

  assert.equal(
    params.url,
    "https://hn.algolia.com/api/v1/search_by_date",
  )
  assert.equal(params.headers?.Accept, "application/json")
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
    thread_id: 49522897,
  })

  assert.equal(params.url, "https://hn.algolia.com/api/v1/search_by_date")
})
