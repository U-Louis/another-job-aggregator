import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import {
  applyForbiddenFilter,
  applyRequiredAnyFilter,
  requiredAnyOfFromSources,
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
      query: { country: "fr", what_or: "typescript vue" },
    },
    {
      id: "b",
      type: "api",
      provider: "adzuna",
      enabled: false,
      query: { country: "fr", what_or: "java" },
    },
  ])

  assert.deepEqual(terms.sort(), ["typescript", "vue"])
})
