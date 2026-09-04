import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt } from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("remotive-remote"), "utf8"))

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.jobs.length)

  const first = fixture.jobs[0]
  const mapped = offers[0]

  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.url, first.url)
  assert.equal(mapped.location, first.candidate_required_location)
  assert.equal(mapped.company, first.company_name)
  assert.equal(mapped.remote, "remote")
  assert.equal(mapped.salary, first.salary?.trim() ?? "")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(first.title, first.company_name),
  )
  assert.equal(mapped.source, "")
  assert.ok(mapped.description.length > 0)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    jobs: [
      {
        id: 1,
        url: "https://remotive.com/remote-jobs/software-development/test-1",
        title: "HTML Job",
        company_name: "Acme",
        publication_date: "2026-01-01T00:00:00",
        description:
          "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt uses unknown company fallback with URL hash digits", () => {
  const offers = adapt({
    jobs: [
      {
        id: 2,
        url: "https://remotive.com/remote-jobs/software-development/test-2",
        title: "No Company Job",
        company_name: "   ",
        publication_date: "2026-01-01T00:00:00",
        description: "Desc",
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt defaults location to Remote when absent", () => {
  const offers = adapt({
    jobs: [
      {
        id: 3,
        url: "https://remotive.com/remote-jobs/software-development/test-3",
        title: "Anywhere Job",
        company_name: "Acme",
        publication_date: "2026-01-01T00:00:00",
        description: "Desc",
      },
    ],
  })

  assert.equal(offers[0]?.location, "Remote")
})
