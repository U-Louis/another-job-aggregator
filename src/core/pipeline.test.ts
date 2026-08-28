import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import { processOffers } from "./pipeline.ts"

test("processOffers applies forbidden filter, dedup, and description truncation", () => {
  const longDescription = "a".repeat(1901)
  const kept = offer({
    title: "Senior Engineer",
    company: "Acme",
    description: longDescription,
  })
  const duplicate = offer({
    title: "Senior Engineer",
    company: "Acme",
    url: "https://example.com/duplicate",
    description: "duplicate",
  })
  const dropped = offer({
    title: "Intern Engineer",
    company: "Other",
    description: "intern role",
  })

  const result = processOffers([kept, duplicate, dropped], ["intern"])

  assert.equal(result.length, 1)
  assert.equal(result[0]?.title, "Senior Engineer")
  assert.equal(result[0]?.description, `${"a".repeat(1900)}…`)
})
