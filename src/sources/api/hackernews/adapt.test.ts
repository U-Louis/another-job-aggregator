import assert from "node:assert/strict"
import { test } from "node:test"
import { makeDedupKey } from "../../../core/normalize.ts"
import {
  adapt,
  extractSalary,
  extractUrl,
  resolveRemote,
  stripHtml,
} from "./adapt.ts"

const fixture = {
  threadId: 49522897,
  threadTitle: "Ask HN: Who is hiring? (September 2026)",
  comments: [
    {
      id: 49650855,
      time: 1789078525,
      by: "catalystwayfare",
      text: "Catalyst·Wayfare AI | Agent Builder | Remote (US ET Overlap) | Full-time / Part-time / Contract | <a href=\"https://catalystwayfare.ai/careers\" rel=\"nofollow\">https://catalystwayfare.ai/careers</a><p>AI transformation firm shipping production AI systems.",
    },
    {
      id: 49524580,
      time: 1789000000,
      by: "wikimedia",
      text: "Wikimedia Foundation | Lead Product Manager, Security | REMOTE (US + 18 countries) | Full-time<p>Join our security team.",
    },
    {
      id: 49525748,
      time: 1789000100,
      by: "discord",
      text: "Discord | Senior Software Engineer, Application Security | San Francisco, CA | ONSITE | $280K–$330K TC<p>Build security tooling.",
    },
    {
      id: 49533854,
      time: 1789000200,
      by: "cnio",
      text: "Spanish National Cancer Research Centre (CNIO) | Madrid, Spain | HYBRID | Senior Scientific Computing Engineer | Full-time<p>Scientific computing role.",
    },
    {
      id: 49523712,
      time: 1789000300,
      by: "quobyte",
      text: "QUOBYTE | Berlin, Germany | Full-time | ONSITE (Germany) | https://www.quobyte.com/<p>We build storage systems.<p>* Software Engineer (with a passion for Systems, 60-100k EUR)",
    },
  ],
}

test("adapt maps HN comments to JobOffer fields", () => {
  const offers = adapt(fixture)

  assert.equal(offers.length, fixture.comments.length)

  const catalyst = offers[0]
  assert.ok(catalyst)
  assert.equal(catalyst.title, "Agent Builder")
  assert.equal(catalyst.company, "Catalyst·Wayfare AI")
  assert.equal(catalyst.url, "https://catalystwayfare.ai/careers")
  assert.equal(catalyst.remote, "remote")
  assert.equal(catalyst.location, "Remote (US ET Overlap)")
  assert.equal(
    catalyst.dedupKey,
    makeDedupKey("Agent Builder", "Catalyst·Wayfare AI"),
  )
  assert.equal(catalyst.source, "")
  assert.ok(catalyst.description.includes("AI transformation firm"))
  assert.ok(catalyst.publishedAt.endsWith("Z"))

  const wikimedia = offers[1]
  assert.ok(wikimedia)
  assert.equal(wikimedia.title, "Lead Product Manager, Security")
  assert.equal(wikimedia.company, "Wikimedia Foundation")
  assert.equal(wikimedia.remote, "remote")

  const discord = offers[2]
  assert.ok(discord)
  assert.equal(discord.title, "Senior Software Engineer, Application Security")
  assert.equal(discord.company, "Discord")
  assert.equal(discord.remote, "onsite")
  assert.equal(discord.salary, "$280K–$330K TC")

  const cnio = offers[3]
  assert.ok(cnio)
  assert.equal(cnio.title, "Senior Scientific Computing Engineer")
  assert.equal(cnio.company, "Spanish National Cancer Research Centre (CNIO)")
  assert.equal(cnio.remote, "hybrid")

  const quobyte = offers[4]
  assert.ok(quobyte)
  assert.equal(quobyte.company, "QUOBYTE")
  assert.equal(quobyte.title, "Software Engineer")
  assert.equal(quobyte.remote, "onsite")
})

test("adapt strips HTML and decodes entities in descriptions", () => {
  const offers = adapt({
    threadId: 1,
    threadTitle: "Ask HN: Who is hiring? (Test)",
    comments: [
      {
        id: 99,
        time: 1700000000,
        text: "Acme Corp | Software Engineer | Remote | Full-time<p>Hello&nbsp;world &amp; team&apos;s work",
      },
    ],
  })

  assert.equal(offers[0]?.description, "Hello world & team's work")
})

test("extractUrl falls back to the HN comment URL", () => {
  assert.equal(
    extractUrl("Acme | Engineer | Remote", 12345),
    "https://news.ycombinator.com/item?id=12345",
  )
})

test("resolveRemote detects hybrid when remote and onsite both appear", () => {
  assert.equal(
    resolveRemote(["OpenRent", "London, UK", "ONSITE+PART REMOTE"], ""),
    "hybrid",
  )
})

test("extractSalary returns empty string when absent", () => {
  assert.equal(extractSalary("Acme | Engineer | Remote"), "")
})

test("stripHtml removes tags and decodes entities", () => {
  assert.equal(
    stripHtml("<p>Hello&nbsp;world</p> &amp; <strong>team</strong>"),
    "Hello world & team",
  )
})
