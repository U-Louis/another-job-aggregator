import assert from "node:assert/strict"
import { test } from "node:test"
import { fetchExternalScraper } from "./fetch.ts"

test("fetchExternalScraper delegates POST requests to the shared fetch layer", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify([{ title: "Job", jobUrl: "https://x" }]), {
      status: 200,
    })
  }) as typeof fetch

  const payload = await fetchExternalScraper(
    {
      url: "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lpfll7v5hcqtkxl6l",
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: '{"titles":["developer"]}',
      timeoutMs: 305_000,
    },
    fetchImpl,
  )

  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.init?.method, "POST")
  assert.equal(calls[0]?.init?.body, '{"titles":["developer"]}')
  assert.ok(Array.isArray(payload))
})
