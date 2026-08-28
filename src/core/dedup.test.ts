import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import { dedup } from "./dedup.ts"
import { applyForbiddenFilter } from "./filter.ts"
import { makeDedupKey, normalize } from "./normalize.ts"

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

test("filter then dedup drops forbidden titles before collapsing duplicates", () => {
  const intern = offer({ title: "Intern Engineer" })
  const first = offer({ title: "Engineer", url: "https://example.com/a" })
  const duplicate = offer({ title: "Engineer", url: "https://example.com/b" })

  assert.deepEqual(
    dedup(applyForbiddenFilter([intern, first, duplicate], ["intern"])),
    [first],
  )
})
