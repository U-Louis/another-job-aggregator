import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt, formatSalary } from "./adapt.ts"
import type { RemoteOkJob } from "./schema.ts"

const fixture = JSON.parse(readFileSync(payloadPath("remoteok-remote"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)
  const jobs = fixture.filter(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      "position" in item &&
      "id" in item,
  )

  assert.equal(offers.length, jobs.length)
  assert.ok(offers.length > 0)

  const first = jobs[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.position)
  assert.equal(mapped.url, first.url)
  assert.equal(mapped.location, first.location?.trim() || "Remote")
  assert.equal(mapped.company, first.company)
  assert.equal(mapped.remote, "remote")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.position, first.company),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt skips metadata object at start of payload", () => {
  const offers = adapt(fixture)

  assert.ok(!offers.some((offer) => offer.title === "legal"))
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt([
    { last_updated: 1, legal: "terms" },
    {
      id: "1",
      url: "https://remoteok.com/remote-jobs/test-1",
      position: "HTML Job",
      company: "Acme",
      date: "2026-01-01T00:00:00+00:00",
      description:
        "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
    },
  ])

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt([
    {
      id: "2",
      url: "https://remoteok.com/remote-jobs/test-2",
      position: "No Company Job",
      company: "   ",
      date: "2026-01-01T00:00:00+00:00",
      description: "Desc",
    },
  ])

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt defaults location to Remote when absent", () => {
  const offers = adapt([
    {
      id: "3",
      url: "https://remoteok.com/remote-jobs/test-3",
      position: "Anywhere Job",
      company: "Acme",
      date: "2026-01-01T00:00:00+00:00",
      description: "Desc",
    },
  ])

  assert.equal(offers[0]?.location, "Remote")
})

test("adapt formats salary ranges and minimums", () => {
  assert.equal(
    formatSalary({ salary_min: 80000, salary_max: 120000 } as RemoteOkJob),
    "80000 - 120000",
  )
  assert.equal(formatSalary({ salary_min: 90000 } as RemoteOkJob), "90000+")
  assert.equal(
    formatSalary({ salary_min: 0, salary_max: 0 } as RemoteOkJob),
    "",
  )
})
