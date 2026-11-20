import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery requests the LaraJobs jobs API", () => {
  const params = buildQuery({})

  assert.equal(params.url, "https://larajobs.com/api/jobs")
  assert.equal(params.headers?.Accept, "application/json")
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })

  assert.equal(params.url, "https://larajobs.com/api/jobs")
  assert.equal(params.url.includes("what_or"), false)
})
