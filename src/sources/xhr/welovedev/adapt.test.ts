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
  WELOVEDEV_JOBS_BASE,
} from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("welovedev"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.hits.length)

  const first = fixture.hits[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.url, buildJobUrl(first))
  assert.equal(mapped.url, `${WELOVEDEV_JOBS_BASE}/${first.seoAlias}`)
  assert.equal(mapped.company, first.smallCompany.companyName)
  assert.equal(mapped.remote, mapRemotePolicy(first.details.remotePolicy.frequency))
  assert.equal(mapped.salary, formatSalary(first))
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.title, first.smallCompany.companyName),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt formats salary ranges and minimums", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "1",
        title: "Range Job",
        seoAlias: "range-job",
        details: {
          salary: { min: 50, max: 70, currency: "€", recurrence: "year" },
        },
        smallCompany: { companyName: "Acme" },
      },
      {
        objectID: "2",
        title: "Min Job",
        seoAlias: "min-job",
        details: {
          salary: { min: 45, maxPerYear: 45, currency: "€", recurrence: "year" },
        },
        smallCompany: { companyName: "Beta" },
      },
    ],
  })

  assert.equal(offers[0]?.salary, "50 - 70 €")
  assert.equal(offers[1]?.salary, "45+ €")
})

test("adapt strips markdown in descriptions", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "3",
        title: "Markdown Job",
        seoAlias: "markdown-job",
        mdDescription: "**Hello** _world_ and [link](https://example.com)",
        smallCompany: { companyName: "Acme" },
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world and link")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "4",
        title: "No Company Job",
        seoAlias: "no-company-job",
        smallCompany: { companyName: "   " },
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt maps remote policies from WeLoveDevs values", () => {
  assert.equal(mapRemotePolicy("fullTime"), "remote")
  assert.equal(mapRemotePolicy("hybrid"), "hybrid")
  assert.equal(mapRemotePolicy("regularly"), "hybrid")
  assert.equal(mapRemotePolicy("occasionally"), "hybrid")
  assert.equal(mapRemotePolicy("no"), "onsite")
  assert.equal(mapRemotePolicy(undefined), "unknown")
})

test("adapt normalizes publishDate milliseconds to ISO 8601", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "5",
        title: "Date Job",
        seoAlias: "date-job",
        publishDate: 1_789_028_648_768,
        smallCompany: { companyName: "Acme" },
      },
    ],
  })

  assert.equal(offers[0]?.publishedAt, "2026-09-10T08:24:08.768Z")
})
