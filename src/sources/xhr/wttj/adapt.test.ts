import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import {
  adapt,
  buildJobUrl,
  formatSalary,
  mapRemotePolicy,
} from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("wttj"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.hits.length)

  const first = fixture.hits[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.name)
  assert.equal(mapped.url, buildJobUrl(first))
  assert.equal(mapped.company, first.organization.name)
  assert.equal(mapped.remote, mapRemotePolicy(first.remote))
  assert.equal(mapped.salary, formatSalary(first))
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.name, first.organization.name),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt formats salary ranges and minimums", () => {
  const offers = adapt({
    hits: [
      {
        reference: "1",
        name: "Range Job",
        slug: "range-job_paris",
        published_at: "2026-01-01T00:00:00Z",
        salary_minimum: 50000,
        salary_maximum: 70000,
        salary_currency: "EUR",
        organization: { name: "Acme", slug: "acme" },
      },
      {
        reference: "2",
        name: "Min Job",
        slug: "min-job_paris",
        published_at: "2026-01-01T00:00:00Z",
        salary_yearly_minimum: 45000,
        salary_currency: "EUR",
        organization: { name: "Beta", slug: "beta" },
      },
    ],
  })

  assert.equal(offers[0]?.salary, "50000 - 70000 EUR")
  assert.equal(offers[1]?.salary, "45000+ EUR")
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    hits: [
      {
        reference: "3",
        name: "HTML Job",
        slug: "html-job_paris",
        published_at: "2026-01-01T00:00:00Z",
        summary: "Short summary",
        profile: "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
        organization: { name: "Acme", slug: "acme" },
      },
    ],
  })

  assert.match(offers[0]?.description ?? "", /Short summary/)
  assert.match(offers[0]?.description ?? "", /Hello world & team's work/)
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt({
    hits: [
      {
        reference: "4",
        name: "No Company Job",
        slug: "no-company-job_paris",
        published_at: "2026-01-01T00:00:00Z",
        organization: { name: "   ", slug: "empty-co" },
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt maps remote policies from WTTJ values", () => {
  assert.equal(mapRemotePolicy("fulltime"), "remote")
  assert.equal(mapRemotePolicy("partial"), "hybrid")
  assert.equal(mapRemotePolicy("punctual"), "hybrid")
  assert.equal(mapRemotePolicy("no"), "onsite")
  assert.equal(mapRemotePolicy("unknown"), "unknown")
})

test("adapt normalizes publishedAt to ISO 8601", () => {
  const offers = adapt({
    hits: [
      {
        reference: "5",
        name: "Date Job",
        slug: "date-job_paris",
        published_at: "2026-09-02T00:03:36Z",
        organization: { name: "Acme", slug: "acme" },
      },
    ],
  })

  assert.equal(offers[0]?.publishedAt, "2026-09-02T00:03:36.000Z")
})
