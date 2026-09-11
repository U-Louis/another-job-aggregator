import assert from "node:assert/strict"
import { test } from "node:test"
import { parseFeed } from "./parse-feed.ts"

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample RSS</title>
    <item>
      <title>Acme Corp: Backend Engineer</title>
      <link>https://example.com/jobs/backend</link>
      <guid>https://example.com/jobs/backend</guid>
      <description>&lt;p&gt;Build APIs&lt;/p&gt;</description>
      <pubDate>Tue, 18 Aug 2026 20:32:50 +0000</pubDate>
      <region>Anywhere in the World</region>
      <category>Full-Stack Programming</category>
    </item>
  </channel>
</rss>`

const ATOM_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Atom</title>
  <entry>
    <title>Frontend Engineer</title>
    <link href="https://example.com/jobs/frontend" />
    <id>https://example.com/jobs/frontend</id>
    <updated>2026-08-18T20:32:50Z</updated>
    <summary>Build UI</summary>
    <author><name>Acme Corp</name></author>
    <category term="Engineering" />
  </entry>
</feed>`

const JSON_SAMPLE = `{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Sample JSON Feed",
  "items": [
    {
      "id": "https://example.com/jobs/data",
      "title": "Data Engineer",
      "url": "https://example.com/jobs/data",
      "content_html": "<p>Build pipelines</p>",
      "date_published": "2026-08-18T20:32:50Z",
      "authors": [{ "name": "Data Co" }],
      "tags": ["data"]
    }
  ]
}`

test("parseFeed parses RSS items with custom elements", () => {
  const payload = parseFeed(RSS_SAMPLE)

  assert.equal(payload.format, "rss")
  assert.equal(payload.items.length, 1)

  const item = payload.items[0]
  assert.ok(item)
  assert.equal(item.title, "Acme Corp: Backend Engineer")
  assert.equal(item.link, "https://example.com/jobs/backend")
  assert.equal(item.publishedAt, "Tue, 18 Aug 2026 20:32:50 +0000")
  assert.equal(item.extras?.region, "Anywhere in the World")
  assert.deepEqual(item.categories, ["Full-Stack Programming"])
})

test("parseFeed parses Atom entries", () => {
  const payload = parseFeed(ATOM_SAMPLE)

  assert.equal(payload.format, "atom")
  assert.equal(payload.items.length, 1)

  const item = payload.items[0]
  assert.ok(item)
  assert.equal(item.title, "Frontend Engineer")
  assert.equal(item.link, "https://example.com/jobs/frontend")
  assert.equal(item.publishedAt, "2026-08-18T20:32:50Z")
  assert.equal(item.author, "Acme Corp")
  assert.deepEqual(item.categories, ["Engineering"])
})

test("parseFeed parses JSON Feed items", () => {
  const payload = parseFeed(JSON_SAMPLE)

  assert.equal(payload.format, "json")
  assert.equal(payload.items.length, 1)

  const item = payload.items[0]
  assert.ok(item)
  assert.equal(item.title, "Data Engineer")
  assert.equal(item.link, "https://example.com/jobs/data")
  assert.equal(item.publishedAt, "2026-08-18T20:32:50Z")
  assert.equal(item.author, "Data Co")
  assert.deepEqual(item.categories, ["data"])
})

test("parseFeed rejects unsupported formats", () => {
  assert.throws(() => parseFeed("<html><body>not a feed</body></html>"), /Unsupported feed format/)
})
