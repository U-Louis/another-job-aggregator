import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt, formatSalary } from "./adapt.ts"
import type { HimalayasJob } from "./schema.ts"

const fixture = JSON.parse(readFileSync(payloadPath("himalayas"), "utf8"))

function job(overrides: Partial<HimalayasJob> = {}): HimalayasJob {
  return {
    title: "Developer",
    companyName: "Acme",
    applicationLink:
      "https://himalayas.app/companies/acme/jobs/developer?utm_source=api",
    locationRestrictions: [],
    minSalary: null,
    maxSalary: null,
    currency: null,
    salaryPeriod: null,
    description: "Desc",
    pubDate: 1_793_238_550,
    ...overrides,
  }
}

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.jobs.length)
  assert.ok(offers.length > 0)

  const first = fixture.jobs[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.company, first.companyName)
  assert.equal(mapped.url, first.applicationLink)
  assert.equal(mapped.url.includes("utm_source=api"), true)
  assert.equal(mapped.location, "Worldwide")
  assert.equal(mapped.remote, "remote")
  assert.equal(mapped.salary, "20 - 30 USD hourly")
  assert.equal(mapped.dedupKey, makeDedupKey(first.title, first.companyName))
  assert.equal(mapped.source, "")
  assert.equal(mapped.publishedAt, new Date(first.pubDate * 1000).toISOString())
  assert.ok(mapped.publishedAt.endsWith("Z"))
  assert.ok(mapped.description.length > first.excerpt.length)
  assert.equal(mapped.description.includes("<"), false)
  assert.notEqual(mapped.description, first.excerpt)

  const unpaidIndex = fixture.jobs.findIndex(
    (entry: { minSalary: number | null; maxSalary: number | null }) =>
      entry.minSalary === null && entry.maxSalary === null,
  )
  assert.ok(unpaidIndex >= 0)
  assert.equal(offers[unpaidIndex]?.salary, "")

  const encoded = fixture.jobs.find((entry: { description: string }) =>
    entry.description.includes("&amp;"),
  )
  assert.ok(encoded)
  const encodedOffer = offers.find((offer) => offer.title === encoded.title)
  assert.ok(encodedOffer)
  assert.equal(encodedOffer.description.includes("&amp;"), false)
  assert.equal(encodedOffer.description.includes("<"), false)
  assert.equal(encodedOffer.description.includes("&"), true)
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    jobs: [
      job({
        description:
          "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
      }),
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt keeps the application link and uses Worldwide when unrestricted", () => {
  const offers = adapt({
    jobs: [
      job({
        locationRestrictions: ["United States", " Canada "],
      }),
      job({
        title: "Open role",
        applicationLink:
          "https://himalayas.app/companies/acme/jobs/open?utm_source=api",
        locationRestrictions: [],
      }),
    ],
  })

  assert.equal(offers[0]?.location, "United States, Canada")
  assert.equal(offers[0]?.url.includes("utm_source=api"), true)
  assert.equal(offers[1]?.location, "Worldwide")
  assert.equal(offers[1]?.remote, "remote")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt({
    jobs: [job({ companyName: "   " })],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
  assert.equal(offers[0].dedupKey, makeDedupKey("Developer", offers[0].company))
})

test("adapt skips offers with an empty title or url", () => {
  const offers = adapt({
    jobs: [
      job({ title: "   " }),
      job({ applicationLink: "  " }),
      job({ title: "Kept" }),
    ],
  })

  assert.equal(offers.length, 1)
  assert.equal(offers[0]?.title, "Kept")
})

test("adapt guards an invalid pubDate with the epoch", () => {
  const offers = adapt({
    jobs: [job({ pubDate: 1e17 })],
  })

  assert.equal(offers[0]?.publishedAt, new Date(0).toISOString())
})

test("adapt formats salary bounds with currency and period", () => {
  assert.equal(
    formatSalary(
      job({
        minSalary: 25000,
        maxSalary: 35000,
        currency: "PLN",
        salaryPeriod: "monthly",
      }),
    ),
    "25000 - 35000 PLN monthly",
  )
  assert.equal(
    formatSalary(job({ minSalary: 25000, currency: "PLN" })),
    "25000+ PLN",
  )
  assert.equal(formatSalary(job({ maxSalary: 35000 })), "up to 35000")
  assert.equal(
    formatSalary(job({ salaryPeriod: "annual" })),
    "",
  )
})
