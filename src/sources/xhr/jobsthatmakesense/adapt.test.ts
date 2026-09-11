import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import {
  adapt,
  buildJobUrl,
  formatSalary,
  JTMS_JOBS_BASE,
  mapRemotePolicy,
} from "./adapt.ts"

const fixture = JSON.parse(
  readFileSync(payloadPath("jobsthatmakesense"), "utf8"),
)

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.hits.length)

  const first = fixture.hits[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.url, buildJobUrl(first))
  assert.equal(
    mapped.url,
    `${JTMS_JOBS_BASE}/${first.locale ?? "fr"}/jobs/${first.slug ?? first.objectID}`,
  )
  assert.equal(mapped.company, first.projectName)
  assert.equal(mapped.remote, mapRemotePolicy(first.remote))
  assert.equal(mapped.salary, formatSalary(first))
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.title, first.projectName),
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
        slug: "range-job",
        salaryMin: 40_000,
        salaryMax: 45_000,
        salaryCurrency: "EUR",
        projectName: "Acme",
      },
      {
        objectID: "2",
        title: "Min Job",
        slug: "min-job",
        salaryMin: 35_000,
        projectName: "Beta",
      },
    ],
  })

  assert.equal(offers[0]?.salary, "40000 - 45000 EUR")
  assert.equal(offers[1]?.salary, "35000+")
})

test("adapt strips HTML in descriptions", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "3",
        title: "HTML Job",
        slug: "html-job",
        content: "<p><strong>Hello</strong> world</p>",
        projectName: "Acme",
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "4",
        title: "No Company Job",
        slug: "no-company-job",
        projectName: "   ",
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt maps remote policies from JTMS values", () => {
  assert.equal(mapRemotePolicy("full"), "remote")
  assert.equal(mapRemotePolicy("partial"), "hybrid")
  assert.equal(mapRemotePolicy("punctual"), "hybrid")
  assert.equal(mapRemotePolicy("no"), "onsite")
  assert.equal(mapRemotePolicy("unknown"), "unknown")
  assert.equal(mapRemotePolicy(undefined), "unknown")
})

test("adapt normalizes unix timestamps to ISO 8601", () => {
  const offers = adapt({
    hits: [
      {
        objectID: "5",
        title: "Date Job",
        slug: "date-job",
        updatedAt: 1_784_792_636,
        projectName: "Acme",
      },
    ],
  })

  assert.equal(
    offers[0]?.publishedAt,
    new Date(1_784_792_636 * 1000).toISOString(),
  )
})
