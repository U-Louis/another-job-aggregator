import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt, formatSalary } from "./adapt.ts"
import type { LinkedInJob } from "./schema.ts"

const fixture = JSON.parse(readFileSync(payloadPath("linkedin-remote"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.length)

  const first = fixture[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.job_title)
  assert.equal(mapped.url, first.url)
  assert.equal(mapped.location, first.job_location)
  assert.equal(mapped.company, first.company_name)
  assert.equal(mapped.remote, "remote")
  assert.equal(mapped.publishedAt, new Date(first.job_posted_date).toISOString())
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.job_title, first.company_name),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
})

test("adapt formats salary ranges and pay bands", () => {
  assert.equal(
    formatSalary({
      url: "https://www.linkedin.com/jobs/view/1",
      job_title: "Job",
      job_base_pay_range: "€70,000.00/yr - €90,000.00/yr",
    }),
    "€70,000.00/yr - €90,000.00/yr",
  )
  assert.equal(
    formatSalary({
      url: "https://www.linkedin.com/jobs/view/2",
      job_title: "Job",
      base_salary: {
        min_amount: 60000,
        max_amount: 70000,
        currency: "EUR",
        payment_period: "yr",
      },
    }),
    "60000 - 70000 EUR/yr",
  )
  assert.equal(
    formatSalary({
      url: "https://www.linkedin.com/jobs/view/3",
      job_title: "Job",
      base_salary: { min_amount: 45000, currency: "EUR" },
    }),
    "45000+ EUR",
  )
  assert.equal(
    formatSalary({
      url: "https://www.linkedin.com/jobs/view/4",
      job_title: "Job",
    }),
    "",
  )
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt([
    {
      url: "https://www.linkedin.com/jobs/view/1",
      job_title: "HTML Job",
      job_posted_date: "2026-01-01T00:00:00.000Z",
      job_summary:
        "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
      company_name: "Acme",
    },
  ])

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt([
    {
      url: "https://www.linkedin.com/jobs/view/999",
      job_title: "No Company Job",
      job_posted_date: "2026-01-01T00:00:00.000Z",
      job_summary: "Desc",
    },
  ])

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt normalizes job_posted_date to ISO 8601", () => {
  const offers = adapt([
    {
      url: "https://www.linkedin.com/jobs/view/2",
      job_title: "Date Job",
      job_posted_date: "2026-08-10T13:18:16Z",
      job_summary: "Desc",
      company_name: "Acme",
    },
  ])

  assert.equal(offers[0]?.publishedAt, "2026-08-10T13:18:16.000Z")
})

test("adapt maps hybrid and onsite work types from discovery_input", () => {
  const offers = adapt([
    {
      url: "https://www.linkedin.com/jobs/view/3",
      job_title: "Hybrid Job",
      job_posted_date: "2026-01-01T00:00:00.000Z",
      job_summary: "Desc",
      company_name: "Acme",
      discovery_input: { remote: "Hybrid" },
    },
    {
      url: "https://www.linkedin.com/jobs/view/4",
      job_title: "Onsite Job",
      job_posted_date: "2026-01-01T00:00:00.000Z",
      job_summary: "Desc",
      company_name: "Acme",
      discovery_input: { remote: "On-site" },
    },
  ])

  assert.equal(offers[0]?.remote, "hybrid")
  assert.equal(offers[1]?.remote, "onsite")
})
