import assert from "node:assert/strict"
import { test } from "node:test"
import type { JobOffer } from "../types/job-offer.ts"
import { makeDedupKey } from "./normalize.ts"
import { processOffers } from "./pipeline.ts"

function offer(overrides: Partial<JobOffer> = {}): JobOffer {
  const title = overrides.title ?? "Engineer"
  const company = overrides.company ?? "Acme"
  return {
    title,
    company,
    dedupKey: overrides.dedupKey ?? makeDedupKey(title, company),
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

test("processOffers filters forbidden titles then keeps the first duplicate", () => {
  const intern = offer({ title: "Intern Engineer" })
  const first = offer({ title: "Engineer", url: "https://example.com/a" })
  const duplicate = offer({ title: "Engineer", url: "https://example.com/b" })

  assert.deepEqual(processOffers([intern, first, duplicate], ["intern"]), [
    first,
  ])
})
