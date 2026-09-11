import assert from "node:assert/strict"
import { test } from "node:test"
import { fetchRss } from "./fetch.ts"

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample RSS</title>
    <item>
      <title>Acme Corp: Backend Engineer</title>
      <link>https://example.com/jobs/backend</link>
      <guid>https://example.com/jobs/backend</guid>
      <description>Build APIs</description>
      <pubDate>Tue, 18 Aug 2026 20:32:50 +0000</pubDate>
    </item>
  </channel>
</rss>`

function mockFetch(responses: Array<Response | Error>): typeof fetch {
  let call = 0
  return (async () => {
    const next = responses[call]
    call++
    if (next instanceof Error) {
      throw next
    }
    return next
  }) as typeof fetch
}

test("fetchRss returns parsed feed payload on success", async () => {
  const fetchImpl = mockFetch([new Response(RSS_SAMPLE, { status: 200 })])

  const payload = await fetchRss({ url: "https://example.com/feed.rss" }, fetchImpl)
  assert.equal(payload.format, "rss")
  assert.equal(payload.items.length, 1)
  assert.equal(payload.items[0]?.title, "Acme Corp: Backend Engineer")
})

test("fetchRss retries on 5xx and eventually succeeds", async () => {
  const fetchImpl = mockFetch([
    new Response("fail", { status: 503, statusText: "Unavailable" }),
    new Response(RSS_SAMPLE, { status: 200 }),
  ])

  const payload = await fetchRss({ url: "https://example.com/feed.rss" }, fetchImpl)
  assert.equal(payload.items.length, 1)
})

test("fetchRss does not retry on 4xx client errors", async () => {
  let calls = 0
  const fetchImpl = (async () => {
    calls++
    return new Response("not found", { status: 404, statusText: "Not Found" })
  }) as typeof fetch

  await assert.rejects(
    () => fetchRss({ url: "https://example.com/feed.rss" }, fetchImpl),
    /HTTP 404 Not Found/,
  )
  assert.equal(calls, 1)
})
