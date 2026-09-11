import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_XHR_HEADERS, fetchXhr } from "./fetch.ts"

test("fetchXhr merges browser-like default headers", async () => {
  const calls: RequestInit[] = []
  const fetchImpl = (async (_url, init) => {
    calls.push(init ?? {})
    return new Response(JSON.stringify({ jobs: [] }), { status: 200 })
  }) as typeof fetch

  await fetchXhr({ url: "https://example.com/api/jobs" }, fetchImpl)

  const headers = calls[0]?.headers as Record<string, string>
  assert.equal(headers.Accept, DEFAULT_XHR_HEADERS.Accept)
  assert.equal(headers["User-Agent"], DEFAULT_XHR_HEADERS["User-Agent"])
})

test("fetchXhr lets provider headers override defaults", async () => {
  const calls: RequestInit[] = []
  const fetchImpl = (async (_url, init) => {
    calls.push(init ?? {})
    return new Response("{}", { status: 200 })
  }) as typeof fetch

  await fetchXhr(
    {
      url: "https://example.com/api/jobs",
      headers: {
        Accept: "application/json",
        Origin: "https://example.com",
        Referer: "https://example.com/jobs",
      },
    },
    fetchImpl,
  )

  const headers = calls[0]?.headers as Record<string, string>
  assert.equal(headers.Accept, "application/json")
  assert.equal(headers.Origin, "https://example.com")
  assert.equal(headers.Referer, "https://example.com/jobs")
  assert.equal(headers["User-Agent"], DEFAULT_XHR_HEADERS["User-Agent"])
})

test("fetchXhr forwards method, body, and retries via the shared fetch layer", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let attempt = 0
  const fetchImpl = (async (url, init) => {
    calls.push({ url: String(url), init })
    attempt++
    if (attempt < 2) {
      return new Response("fail", { status: 503, statusText: "Unavailable" })
    }
    return new Response(JSON.stringify([{ title: "Job" }]), { status: 200 })
  }) as typeof fetch

  const payload = await fetchXhr(
    {
      url: "https://example.com/api/search",
      method: "POST",
      body: '{"q":"typescript"}',
      headers: { "Content-Type": "application/json" },
    },
    fetchImpl,
  )

  assert.equal(calls.length, 2)
  assert.equal(calls[0]?.init?.method, "POST")
  assert.equal(calls[0]?.init?.body, '{"q":"typescript"}')
  assert.deepEqual(payload, [{ title: "Job" }])
})
