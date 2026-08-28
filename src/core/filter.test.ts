import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import { applyForbiddenFilter } from "./filter.ts"

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
