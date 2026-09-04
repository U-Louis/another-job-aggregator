import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import {
  applyExcludedRemoteFilter,
  applyForbiddenFilter,
  applyRequiredAnyFilter,
  applyRequiredAnyRemoteFilter,
  excludedRemoteFromSources,
  requiredAnyOfFromSources,
  requiredAnyOfRemoteFromSources,
} from "./filter.ts"

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

test("applyRequiredAnyFilter keeps offers matching at least one term in title or description", () => {
  const inTitle = offer({
    title: "Senior TypeScript Engineer",
    description: "Build APIs",
  })
  const inDescription = offer({
    title: "Backend Engineer",
    description: "Strong symfony experience required",
    dedupKey: "backend engineer | acme",
  })
  const dropped = offer({
    title: "Product Manager",
    description: "No stack listed",
    dedupKey: "product manager | acme",
  })

  const result = applyRequiredAnyFilter(
    [inTitle, inDescription, dropped],
    ["typescript", "symfony"],
  )
  assert.deepEqual(result, [inTitle, inDescription])
})

test("applyRequiredAnyFilter is case-insensitive", () => {
  const kept = offer({ title: "VUE Developer" })
  assert.deepEqual(applyRequiredAnyFilter([kept], ["vue"]), [kept])
})

test("applyRequiredAnyFilter is a no-op when the list is empty", () => {
  const offers = [offer()]
  assert.equal(applyRequiredAnyFilter(offers, []), offers)
})

test("requiredAnyOfFromSources reads what_or from enabled sources only", () => {
  const terms = requiredAnyOfFromSources([
    {
      id: "a",
      type: "api",
      provider: "adzuna",
      enabled: true,
      query: { country: "fr", what: "typescript", what_or: "typescript vue" },
    },
    {
      id: "b",
      type: "api",
      provider: "adzuna",
      enabled: false,
      query: { country: "fr", what: "typescript", what_or: "java" },
    },
  ])

  assert.deepEqual(terms.sort(), ["typescript", "vue"])
})

test("requiredAnyOfRemoteFromSources reads what_or_remote from enabled sources only", () => {
  const terms = requiredAnyOfRemoteFromSources([
    {
      id: "a",
      type: "api",
      provider: "adzuna",
      enabled: true,
      query: { country: "fr", what: "dev", what_or_remote: "remote télétravail" },
    },
    {
      id: "b",
      type: "api",
      provider: "adzuna",
      enabled: false,
      query: { country: "fr", what: "dev", what_or_remote: "hybrid" },
    },
  ])

  assert.deepEqual(terms.sort(), ["remote", "télétravail"])
})

test("applyRequiredAnyRemoteFilter keeps offers matching at least one remote term", () => {
  const remote = offer({
    title: "Full Remote TypeScript Engineer",
    description: "Build APIs",
  })
  const hybrid = offer({
    title: "Engineer",
    description: "Hybrid work in Paris",
    dedupKey: "engineer | acme",
  })
  const onsite = offer({
    title: "On-site Engineer",
    description: "Office-based role",
    dedupKey: "on-site engineer | acme",
  })

  const result = applyRequiredAnyRemoteFilter(
    [remote, hybrid, onsite],
    ["remote", "hybrid", "télétravail"],
  )
  assert.deepEqual(result, [remote, hybrid])
})

test("applyRequiredAnyRemoteFilter keeps offers already marked remote without text match", () => {
  const fromScraper = offer({
    title: "Backend Engineer",
    description: "Build APIs with Node.js",
    remote: "remote",
    dedupKey: "backend engineer | acme",
  })

  const result = applyRequiredAnyRemoteFilter(
    [fromScraper],
    ["remote", "télétravail"],
  )
  assert.deepEqual(result, [fromScraper])
})

test("excludedRemoteFromSources reads what_exclude_remote from enabled sources only", () => {
  const terms = excludedRemoteFromSources([
    {
      id: "a",
      type: "api",
      provider: "adzuna",
      enabled: true,
      query: { country: "fr", what: "dev", what_exclude_remote: "partiel hybrid" },
    },
    {
      id: "b",
      type: "api",
      provider: "adzuna",
      enabled: false,
      query: { country: "fr", what: "dev", what_exclude_remote: "onsite" },
    },
  ])

  assert.deepEqual(terms.sort(), ["hybrid", "partiel"])
})

test("applyExcludedRemoteFilter drops offers matching excluded remote terms in title or description", () => {
  const kept = offer({
    title: "Full Remote Engineer",
    description: "Fully distributed team",
  })
  const droppedTitle = offer({
    title: "Télétravail partiel Engineer",
    description: "Mostly remote",
    dedupKey: "partiel title | acme",
  })
  const droppedDescription = offer({
    title: "Engineer",
    description: "Hybrid schedule available",
    dedupKey: "hybrid desc | acme",
  })

  const result = applyExcludedRemoteFilter(
    [kept, droppedTitle, droppedDescription],
    ["partiel", "hybrid"],
  )
  assert.deepEqual(result, [kept])
})
