import assert from "node:assert/strict"
import { test } from "node:test"
import { truncateDescription } from "./truncate.ts"

test("truncateDescription leaves strings of 1900 characters or fewer unchanged", () => {
  const exact = "a".repeat(1900)
  const short = "short"
  assert.equal(truncateDescription(exact), exact)
  assert.equal(truncateDescription(short), short)
})

test("truncateDescription hard-slices at 1900 characters and appends an ellipsis", () => {
  const long = "b".repeat(1901)
  const truncated = truncateDescription(long)
  assert.equal(truncated.length, 1901)
  assert.equal(truncated, `${"b".repeat(1900)}…`)
})
