import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt, resolveRemote } from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("larajobs"), "utf8"))

function expectedUrl(raw: string): string {
  const url = new URL(raw)
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) {
      url.searchParams.delete(key)
    }
  }
  return url.toString()
}

test("adapt maps fixture jobs to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.ok(offers.length > 0)
  assert.equal(offers.length, fixture.length)

  const first = fixture[0]
  const mapped = offers[0]
  const url = expectedUrl(first.url)
  const description = (first.tags ?? [])
    .map((tag: { name: string }) => tag.name.trim())
    .filter((name: string) => name.length > 0)
    .join(", ")

  assert.ok(first)
  assert.ok(mapped)
  assert.equal(mapped.title, first.title)
  assert.equal(mapped.company, first.organization)
  assert.equal(mapped.url, url)
  assert.equal(mapped.url.includes("utm_"), false)
  assert.equal(mapped.location, first.location)
  assert.equal(mapped.remote, resolveRemote(first.location))
  assert.equal(mapped.salary, first.salary?.trim() ?? "")
  assert.equal(mapped.description, description)
  assert.equal(mapped.dedupKey, makeDedupKey(first.title, first.organization))
  assert.equal(mapped.source, "")
  assert.equal(mapped.publishedAt, new Date(first.published_at).toISOString())
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt derives remote policy from the location string", () => {
  assert.equal(resolveRemote("Remote"), "remote")
  assert.equal(resolveRemote("Remote/USA"), "remote")
  assert.equal(resolveRemote("Remote, EU only (overlap until 10 a.m. Pacific)"), "remote")
  assert.equal(resolveRemote("Hybrid - Central Ohio"), "hybrid")
  assert.equal(
    resolveRemote("Boston, MA/Hybrid (Monday-Wednesday onsite)"),
    "hybrid",
  )
  assert.equal(
    resolveRemote("Remote + part-time onsite (Nantes, Paris, France)"),
    "hybrid",
  )
  assert.equal(resolveRemote("Full remote"), "remote")
  assert.equal(resolveRemote("Kaunas, Lithuania"), "onsite")
  assert.equal(resolveRemote("   "), "unknown")
})

test("adapt strips referral params and uses tags as the description", () => {
  const offers = adapt([
    {
      id: 1,
      organization: "Acme",
      title: "Laravel Developer",
      location: "Remote",
      url: "https://larajobs.com/job/1?utm_source=larajobs&utm_medium=referral",
      salary: "  $100,000  ",
      published_at: "2026-11-16T16:51:21.000000Z",
      tags: [
        { name: "Laravel", slug: "laravel" },
        { name: "PHP", slug: "php" },
      ],
    },
  ])

  assert.equal(offers[0]?.url, "https://larajobs.com/job/1")
  assert.equal(offers[0]?.salary, "$100,000")
  assert.equal(offers[0]?.description, "Laravel, PHP")
  assert.equal(offers[0]?.remote, "remote")
  assert.equal(offers[0]?.publishedAt, "2026-11-16T16:51:21.000Z")
})

test("adapt treats a null salary as empty and falls back when company is blank", () => {
  const offers = adapt([
    {
      id: 2,
      organization: "   ",
      title: "Tech Lead",
      location: "Kaunas, Lithuania",
      url: "https://larajobs.com/job/2",
      salary: null,
      published_at: "not-a-date",
      tags: [],
    },
  ])

  assert.ok(offers[0])
  assert.equal(offers[0].salary, "")
  assert.equal(offers[0].description, "")
  assert.equal(offers[0].remote, "onsite")
  assert.match(offers[0].company, /^unknown \(\d{5}\)$/)
  assert.equal(offers[0].publishedAt, new Date(0).toISOString())
})
