import assert from "node:assert/strict"
import { test } from "node:test"
import { fetchApi } from "./fetch.ts"

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

test("fetchApi returns parsed JSON on success", async () => {
  const fetchImpl = mockFetch([
    new Response(JSON.stringify({ jobs: [1] }), { status: 200 }),
  ])

  const data = await fetchApi({ url: "https://example.com/jobs" }, fetchImpl)
  assert.deepEqual(data, { jobs: [1] })
})

test("fetchApi forwards method, headers, and body", async () => {
  const calls: RequestInit[] = []
  const fetchImpl = (async (_url, init) => {
    calls.push(init ?? {})
    return new Response("{}", { status: 200 })
  }) as typeof fetch

  await fetchApi(
    {
      url: "https://example.com/jobs",
      method: "POST",
      headers: { "X-Test": "1" },
      body: '{"q":"typescript"}',
    },
    fetchImpl,
  )

  assert.equal(calls[0]?.method, "POST")
  assert.equal(calls[0]?.headers?.["X-Test"], "1")
  assert.equal(calls[0]?.body, '{"q":"typescript"}')
})

test("fetchApi retries on 5xx and eventually succeeds", async () => {
  const fetchImpl = mockFetch([
    new Response("fail", { status: 503, statusText: "Unavailable" }),
    new Response("fail", { status: 503, statusText: "Unavailable" }),
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ])

  const data = await fetchApi({ url: "https://example.com/jobs" }, fetchImpl)
  assert.deepEqual(data, { ok: true })
})

test("fetchApi does not retry on 4xx client errors", async () => {
  let calls = 0
  const fetchImpl = (async () => {
    calls++
    return new Response("not found", { status: 404, statusText: "Not Found" })
  }) as typeof fetch

  await assert.rejects(
    () => fetchApi({ url: "https://example.com/jobs" }, fetchImpl),
    /HTTP 404 Not Found/,
  )
  assert.equal(calls, 1)
})

test("fetchApi throws after exhausting retries", async () => {
  const fetchImpl = mockFetch([
    new Response("fail", { status: 500, statusText: "Error" }),
    new Response("fail", { status: 500, statusText: "Error" }),
    new Response("fail", { status: 500, statusText: "Error" }),
    new Response("fail", { status: 500, statusText: "Error" }),
  ])

  await assert.rejects(
    () => fetchApi({ url: "https://example.com/jobs" }, fetchImpl),
    /HTTP 500 Error/,
  )
})

test("fetchApi returns plain text when the body is not JSON", async () => {
  const fetchImpl = mockFetch([new Response("plain text", { status: 200 })])
  const data = await fetchApi({ url: "https://example.com/jobs" }, fetchImpl)
  assert.equal(data, "plain text")
})
