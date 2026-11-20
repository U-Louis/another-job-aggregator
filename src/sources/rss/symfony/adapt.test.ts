import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import { payloadPath } from "../../../payload-path.ts"
import { adapt } from "./adapt.ts"

const fixture = JSON.parse(readFileSync(payloadPath("symfony"), "utf8"))

function splitTitle(rawTitle: string): { title: string; company: string } {
  const separator = " at "
  const separatorIndex = rawTitle.lastIndexOf(separator)
  if (separatorIndex === -1) {
    return { title: rawTitle.trim(), company: "" }
  }
  return {
    title: rawTitle.slice(0, separatorIndex).trim(),
    company: rawTitle.slice(separatorIndex + separator.length).trim(),
  }
}

function labelValue(html: string, label: string): string {
  const match = html.match(new RegExp(`${label}:\\s*</strong>\\s*([^<]+)`, "i"))
  return (match?.[1] ?? "").replace(/\s+/g, " ").trim()
}

function expectedRemote(location: string): string {
  const value = location.toLowerCase()
  const hasRemote = /\bremote\b|télétravail|teletravail/.test(value)
  const hasHybrid =
    value.includes("hybrid") ||
    (hasRemote &&
      (value.includes("part-time") ||
        value.includes("partiel") ||
        value.includes("onsite")))
  if (hasHybrid) return "hybrid"
  if (hasRemote) return "remote"
  if (!value.trim()) return "unknown"
  return "onsite"
}

test("adapt maps fixture feed items to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.ok(offers.length > 0)
  assert.equal(offers.length, fixture.items.length)

  const firstItem = fixture.items[0]
  const mapped = offers[0]
  const expected = splitTitle(firstItem.title)
  const rawDescription = firstItem.description ?? ""
  const location = labelValue(rawDescription, "Location")

  assert.ok(firstItem)
  assert.ok(mapped)
  assert.equal(mapped.title, expected.title)
  assert.equal(mapped.company, expected.company)
  assert.equal(mapped.url, firstItem.link)
  assert.equal(mapped.location, location)
  assert.equal(mapped.remote, expectedRemote(location))
  assert.equal(mapped.salary, labelValue(rawDescription, "Salary"))
  assert.equal(mapped.dedupKey, makeDedupKey(expected.title, expected.company))
  assert.equal(mapped.source, "")
  assert.match(mapped.description, /Salary:/)
  assert.equal(mapped.description.includes("Read the full job description"), false)
  assert.ok(mapped.publishedAt.endsWith("Z"))
})

test("adapt splits the role from the company and reads the stub fields", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Backend Symfony Developer at Edflex",
        link: "https://symfony.com/jobs/5fc8056",
        description: `
          <p>
            <strong>Salary:</strong> €45,000 – €55,000 / year<br>
            <strong>Contract:</strong> Full-time<br>
            <strong>Location:</strong> Remote + part-time onsite (Nantes, Paris, France)
          </p>
          <p><a href="https://symfony.com/jobs/5fc8056">Read the full job description</a></p>
        `,
        publishedAt: "Fri, 13 Nov 2026 15:27:47 +0100",
      },
    ],
  })

  assert.equal(offers[0]?.title, "Backend Symfony Developer")
  assert.equal(offers[0]?.company, "Edflex")
  assert.equal(offers[0]?.salary, "€45,000 – €55,000 / year")
  assert.equal(
    offers[0]?.location,
    "Remote + part-time onsite (Nantes, Paris, France)",
  )
  assert.equal(offers[0]?.remote, "hybrid")
  assert.equal(
    offers[0]?.description,
    "Salary: €45,000 – €55,000 / year Contract: Full-time Location: Remote + part-time onsite (Nantes, Paris, France)",
  )
  assert.equal(offers[0]?.publishedAt, "2026-11-13T14:27:47.000Z")
})

test("adapt maps a full-remote stub and an onsite city", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Backend Symfony Developer at Reiz Tech",
        link: "https://symfony.com/jobs/full-remote",
        description:
          "<p><strong>Salary:</strong> €5,500 / month<br><strong>Contract:</strong> Full-time<br><strong>Location:</strong> Full remote</p>",
        publishedAt: "Tue, 03 Nov 2026 15:40:31 +0100",
      },
      {
        title: "Backend Symfony Developer at Local Co",
        link: "https://symfony.com/jobs/onsite",
        description:
          "<p><strong>Salary:</strong> €40,000 / year<br><strong>Contract:</strong> Full-time<br><strong>Location:</strong> Kaunas, Lithuania</p>",
        publishedAt: "Tue, 20 Oct 2026 11:08:47 +0200",
      },
    ],
  })

  assert.equal(offers[0]?.remote, "remote")
  assert.equal(offers[0]?.location, "Full remote")
  assert.equal(offers[1]?.remote, "onsite")
  assert.equal(offers[1]?.location, "Kaunas, Lithuania")
})

test("adapt decodes entities in the title before splitting the company", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "Backend Symfony Developer at Reggie &amp; Cole",
        link: "https://symfony.com/jobs/reggie",
        description:
          "<p><strong>Salary:</strong> £70,000 – £80,000 / year<br><strong>Location:</strong> Remote + part-time onsite (Manchester, United Kingdom)</p>",
        publishedAt: "Fri, 13 Nov 2026 15:27:47 +0100",
      },
    ],
  })

  assert.equal(offers[0]?.title, "Backend Symfony Developer")
  assert.equal(offers[0]?.company, "Reggie & Cole")
})

test("adapt uses the last 'at' and falls back when company is absent", () => {
  const offers = adapt({
    format: "rss",
    items: [
      {
        title: "DevOps for a Symfony project at Oliver Bernard",
        link: "https://symfony.com/jobs/devops",
        description: "<p><strong>Location:</strong> Full remote</p>",
        publishedAt: "Fri, 13 Nov 2026 15:27:47 +0100",
      },
      {
        title: "Symfony Developer",
        link: "https://symfony.com/jobs/no-company",
        description: "Desc",
        publishedAt: "not-a-date",
      },
    ],
  })

  assert.equal(offers[0]?.title, "DevOps for a Symfony project")
  assert.equal(offers[0]?.company, "Oliver Bernard")
  assert.equal(offers[0]?.salary, "")
  assert.ok(offers[1])
  assert.equal(offers[1].title, "Symfony Developer")
  assert.match(offers[1].company, /^unknown \(\d{5}\)$/)
  assert.equal(offers[1].publishedAt, new Date(0).toISOString())
})
