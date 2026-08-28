import assert from "node:assert/strict"
import { test } from "node:test"
import type { JobOffer } from "../types/job-offer.ts"
import { applyForbiddenFilter } from "./filter.ts"

function offer(overrides: Partial<JobOffer> = {}): JobOffer {
  return {
    dedupKey: "engineer | acme",
    title: "Engineer",
    company: "Acme",
    url: "https://example.com/1",
    location: "Paris",
    remote: "unknown",
    salary: "",
    description: "A job",
    publishedAt: "2026-01-01T00:00:00Z",
    source: "adzuna-remote",
    ...overrides,
  }
}

test("applyForbiddenFilter drops titles that contain a forbidden substring", () => {
  const kept = offer({ title: "Senior TypeScript Engineer" })
  const dropped = offer({
    title: "Intern TypeScript Engineer",
    dedupKey: "intern typescript engineer | acme",
  })

  const result = applyForbiddenFilter([kept, dropped], ["intern", "stage"])
  assert.deepEqual(result, [kept])
})

test("applyForbiddenFilter is case-insensitive", () => {
  const dropped = offer({ title: "STAGE Frontend" })
  assert.deepEqual(applyForbiddenFilter([dropped], ["stage"]), [])
})

test("applyForbiddenFilter does not match against company or description", () => {
  const kept = offer({
    title: "Engineer",
    company: "Intern Corp",
    description: "Great internship culture",
  })
  assert.deepEqual(applyForbiddenFilter([kept], ["intern"]), [kept])
})

test("applyForbiddenFilter is a no-op when the list is empty", () => {
  const offers = [offer()]
  assert.equal(applyForbiddenFilter(offers, []), offers)
})
