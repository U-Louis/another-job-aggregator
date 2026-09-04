import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { fetchPayload } from "./fetch.ts"

const originalKey = process.env.BRIGHT_DATA_KEY

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.BRIGHT_DATA_KEY
  } else {
    process.env.BRIGHT_DATA_KEY = originalKey
  }
})

test("fetchPayload slices results when limit is set", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const fetchImpl = (async (url) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith("/trigger")) {
      return new Response(JSON.stringify({ snapshot_id: "sd_limit" }), {
        status: 200,
      })
    }
    if (path.includes("/progress/")) {
      return new Response(JSON.stringify({ status: "ready" }), { status: 200 })
    }
    if (path.includes("/snapshot/")) {
      return new Response(
        JSON.stringify([
          { job_title: "One", url: "https://www.linkedin.com/jobs/view/1" },
          { job_title: "Two", url: "https://www.linkedin.com/jobs/view/2" },
          { job_title: "Three", url: "https://www.linkedin.com/jobs/view/3" },
        ]),
        { status: 200 },
      )
    }
    throw new Error(`Unexpected URL: ${url}`)
  }) as typeof fetch

  const payload = await fetchPayload(
    { keyword: "developer", limit: 2 },
    fetchImpl,
  )

  assert.equal(Array.isArray(payload), true)
  assert.equal((payload as unknown[]).length, 2)
})
