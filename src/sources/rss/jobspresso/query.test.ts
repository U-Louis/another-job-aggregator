import assert from "node:assert/strict"
import { test } from "node:test"
import { buildQuery } from "./query.ts"

test("buildQuery uses the configured feed URL", () => {
  const params = buildQuery({
    feed_url: "https://jobspresso.co/?feed=job_feed",
  })

  assert.equal(params.url, "https://jobspresso.co/?feed=job_feed")
  assert.ok(params.headers?.Accept?.includes("application/rss+xml"))
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    feed_url: "https://jobspresso.co/?feed=job_feed",
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })

  assert.equal(params.url.includes("what_or"), false)
})

test("buildQuery rejects invalid feed URLs", () => {
  assert.throws(() => buildQuery({ feed_url: "not-a-url" }), /Invalid url/)
})
