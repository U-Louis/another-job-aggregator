import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt } from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("jobspresso"), "utf8"))

test("adapt maps fixture feed items to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.ok(offers.length > 0)
  assert.equal(offers.length, fixture.items.length)

  const firstItem = fixture.items[0]
  const mapped = offers[0]

  assert.ok(firstItem)
  assert.ok(mapped)
  assert.equal(mapped.title, firstItem.title)
  assert.equal(
    mapped.company,
    firstItem.extras?.["job_listing:company"] ?? mapped.company,
  )
  assert.equal(
    mapped.location,
    firstItem.extras?.["job_listing:location"] ?? "Remote",
  )
  assert.equal(mapped.url, firstItem.link)
  assert.equal(mapped.remote, "remote")
  assert.equal(mapped.salary, "")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(mapped.title, mapped.company),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "HTML Job",
        link: "https://jobspresso.co/job/html-job/",
        description:
          "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
        publishedAt: "Sat, 29 Aug 2026 02:12:12 +0000",
        extras: {
          "job_listing:company": "Acme",
          "job_listing:location": "Remote",
        },
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt falls back to author field for company and location", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Fallback Job",
        link: "https://jobspresso.co/job/fallback-job/",
        description: "Desc",
        publishedAt: "Sat, 29 Aug 2026 02:12:12 +0000",
        author: "Acme Corp<br>⚲&nbsp;Canada",
      },
    ],
  })

  assert.equal(offers[0]?.company, "Acme Corp")
  assert.equal(offers[0]?.location, "Canada")
})

test("adapt uses unknown company fallback when company is absent", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "No Company Job",
        link: "https://jobspresso.co/job/no-company-job/",
        description: "Desc",
        publishedAt: "Sat, 29 Aug 2026 02:12:12 +0000",
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt defaults location to Remote when location is absent", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Anywhere Job",
        link: "https://jobspresso.co/job/anywhere-job/",
        description: "Desc",
        publishedAt: "Sat, 29 Aug 2026 02:12:12 +0000",
        extras: {
          "job_listing:company": "Acme",
        },
      },
    ],
  })

  assert.equal(offers[0]?.location, "Remote")
})
