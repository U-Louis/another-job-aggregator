import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt } from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("weworkremotely"), "utf8"))

function splitTitle(rawTitle: string): { company: string; title: string } {
  const separatorIndex = rawTitle.indexOf(": ")
  if (separatorIndex === -1) {
    return { company: "", title: rawTitle.trim() }
  }
  return {
    company: rawTitle.slice(0, separatorIndex).trim(),
    title: rawTitle.slice(separatorIndex + 2).trim(),
  }
}

test("adapt maps fixture feed items to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.ok(offers.length > 0)
  assert.equal(offers.length, fixture.items.length)

  const firstItem = fixture.items[0]
  const mapped = offers[0]
  const expected = splitTitle(firstItem.title)

  assert.ok(firstItem)
  assert.ok(mapped)
  assert.equal(mapped.title, expected.title)
  assert.equal(mapped.company, expected.company || mapped.company)
  assert.equal(mapped.url, firstItem.link)
  assert.equal(mapped.location, firstItem.extras?.region ?? "Remote")
  assert.equal(mapped.remote, "remote")
  assert.equal(mapped.salary, "")
  assert.equal(
    mapped.dedupKey,
    makeDedupKey(expected.title, expected.company || mapped.company),
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
        title: "Acme: HTML Job",
        link: "https://weworkremotely.com/remote-jobs/acme-html-job",
        description:
          "<p>Hello&nbsp;world</p> &amp; <strong>team&apos;s</strong> work",
        publishedAt: "Tue, 18 Aug 2026 20:32:50 +0000",
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("adapt uses unknown company fallback when title has no company prefix", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "No Company Job",
        link: "https://weworkremotely.com/remote-jobs/no-company-job",
        description: "Desc",
        publishedAt: "Tue, 18 Aug 2026 20:32:50 +0000",
      },
    ],
  })

  assert.ok(offers[0])
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
})

test("adapt defaults location to Remote when region is absent", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Acme: Anywhere Job",
        link: "https://weworkremotely.com/remote-jobs/acme-anywhere-job",
        description: "Desc",
        publishedAt: "Tue, 18 Aug 2026 20:32:50 +0000",
      },
    ],
  })

  assert.equal(offers[0]?.location, "Remote")
})
