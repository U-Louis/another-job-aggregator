import assert from "node:assert/strict"
import { test } from "node:test"
import type { JobOffer } from "../types/job-offer.ts"
import { dedup } from "./dedup.ts"
import { makeDedupKey, normalize } from "./normalize.ts"

function offer(overrides: Partial<JobOffer> = {}): JobOffer {
  const title = overrides.title ?? "Senior Engineer"
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

test("normalize lowercases, strips punctuation, and collapses whitespace", () => {
  assert.equal(normalize("  Senior  Engineer!! "), "senior engineer")
})

test("makeDedupKey joins normalized title and company with a pipe", () => {
  assert.equal(
    makeDedupKey("Senior Engineer!", "Acme, Inc."),
    "senior engineer | acme inc",
  )
})

test("dedup collapses offers that share a key and keeps the first winner", () => {
  const first = offer({
    url: "https://example.com/first",
    source: "adzuna-remote",
  })
  const duplicate = offer({
    url: "https://example.com/second",
    source: "adzuna-not-remote",
  })
  const other = offer({
    title: "Staff Engineer",
    url: "https://example.com/other",
  })

  assert.deepEqual(dedup([first, duplicate, other]), [first, other])
})

test("dedup treats punctuation and case as the same job when keys are normalized", () => {
  const a = offer({ title: "TypeScript Dev", company: "Foo" })
  const b = offer({ title: "typescript  dev.", company: "FOO" })
  assert.equal(a.dedupKey, b.dedupKey)
  assert.deepEqual(dedup([a, b]), [a])
})
