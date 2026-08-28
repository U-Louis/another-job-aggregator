import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt, formatSalary } from "./adapt.ts"
import type { AdzunaJob } from "./schema.ts"

const fixture = JSON.parse(readFileSync(payloadPath("adzuna-remote"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.results.length)

  const first = fixture.results[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.url, first.redirect_url)
  assert.equal(mapped.location, first.location.display_name)
  assert.equal(mapped.company, first.company.display_name)
  assert.equal(mapped.remote, "unknown")
  assert.equal(mapped.salary, "")
  assert.equal(mapped.publishedAt, "2026-08-10T13:18:16.000Z")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.title, first.company.display_name),
  )
  assert.equal(mapped.description, first.description)
  assert.equal(mapped.source, "")
})

test("adapt formats salary ranges and minimums", () => {
  assert.equal(
    formatSalary({ salary_min: 400, salary_max: 530 } as AdzunaJob),
    "400 - 530",
  )
  assert.equal(
    formatSalary({
      salary_min: 60000,
      salary_max: 70000,
      salary_currency: "EUR",
    } as AdzunaJob),
    "60000 - 70000 EUR",
  )
  assert.equal(
    formatSalary({ salary_min: 50000, salary_max: 100000 } as AdzunaJob),
    "50000 - 100000",
  )
  assert.equal(formatSalary({ salary_min: 45000 } as AdzunaJob), "45000+")
  assert.equal(formatSalary({} as AdzunaJob), "")
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    results: [
      {
        title: "HTML Job",
        redirect_url: "https://www.adzuna.fr/details/1",
        created: "2026-01-01T00:00:00Z",
        description:
          "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
        location: { display_name: "Paris" },
        company: { display_name: "Acme" },
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const jobWithoutCompany = fixture.results.find(
    (job) => !job.company?.display_name?.trim(),
  )
  assert.ok(jobWithoutCompany)

  const offers = adapt(fixture)
  const mapped = offers.find((offer) => offer.url === jobWithoutCompany.redirect_url)

  assert.ok(mapped)
  assert.match(mapped.company, /^unknown \(\d{5}\)$/)
  assert.equal(mapped.salary, "60000 - 70000")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(mapped.title, mapped.company),
  )
})

test("adapt normalizes publishedAt to ISO 8601", () => {
  const offers = adapt({
    results: [
      {
        title: "Date Job",
        redirect_url: "https://www.adzuna.fr/details/2",
        created: "2026-08-10T13:18:16Z",
        description: "Desc",
        location: { display_name: "Paris" },
        company: { display_name: "Acme" },
      },
    ],
  })

  assert.equal(offers[0]?.publishedAt, "2026-08-10T13:18:16.000Z")
})
