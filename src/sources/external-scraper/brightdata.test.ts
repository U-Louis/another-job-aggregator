import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import {
  downloadBrightDataSnapshot,
  fetchLinkedInDiscover,
  pollBrightDataSnapshot,
  triggerLinkedInDiscover,
} from "./brightdata.ts"

const originalKey = process.env.BRIGHT_DATA_KEY

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.BRIGHT_DATA_KEY
  } else {
    process.env.BRIGHT_DATA_KEY = originalKey
  }
})

test("triggerLinkedInDiscover posts discover input and returns snapshot_id", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl = (async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ snapshot_id: "sd_test123" }), {
      status: 200,
    })
  }) as typeof fetch

  const snapshotId = await triggerLinkedInDiscover(
    {
      keyword: "typescript developer",
      location: "France",
      country: "FR",
      remote: "Remote",
      time_range: "Past week",
    },
    fetchImpl,
  )

  assert.equal(snapshotId, "sd_test123")
  assert.equal(calls.length, 1)
  assert.match(calls[0]?.url, /\/trigger\?/)
  assert.match(calls[0]?.url, /dataset_id=gd_lpfll7v5hcqtkxl6l/)
  assert.match(calls[0]?.url, /discover_by=keyword/)
  assert.equal(calls[0]?.init?.method, "POST")
  assert.equal(
    calls[0]?.init?.headers &&
      (calls[0].init.headers as Record<string, string>).Authorization,
    "Bearer test-bright-data-key",
  )

  const body = JSON.parse(String(calls[0]?.init?.body))
  assert.deepEqual(body.input[0].keyword, "typescript developer")
})

test("pollBrightDataSnapshot waits until status is ready", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  let polls = 0
  const fetchImpl = (async () => {
    polls += 1
    const status = polls < 2 ? "running" : "ready"
    return new Response(JSON.stringify({ status }), { status: 200 })
  }) as typeof fetch

  await pollBrightDataSnapshot("sd_test123", fetchImpl, { pollIntervalMs: 0 })

  assert.equal(polls, 2)
})

test("pollBrightDataSnapshot throws when snapshot fails", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const fetchImpl = (async () =>
    new Response(JSON.stringify({ status: "failed" }), {
      status: 200,
    })) as typeof fetch

  await assert.rejects(
    () => pollBrightDataSnapshot("sd_test123", fetchImpl, { pollIntervalMs: 0 }),
    /failed/,
  )
})

test("downloadBrightDataSnapshot returns parsed JSON", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const fetchImpl = (async (url) => {
    assert.match(String(url), /\/snapshot\/sd_test123/)
    return new Response(JSON.stringify([{ job_title: "Engineer" }]), {
      status: 200,
    })
  }) as typeof fetch

  const data = await downloadBrightDataSnapshot("sd_test123", fetchImpl)
  assert.deepEqual(data, [{ job_title: "Engineer" }])
})

test("fetchLinkedInDiscover runs trigger, poll, and download", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const fetchImpl = (async (url) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith("/trigger")) {
      return new Response(JSON.stringify({ snapshot_id: "sd_chain" }), {
        status: 200,
      })
    }
    if (path.includes("/progress/")) {
      return new Response(JSON.stringify({ status: "ready" }), { status: 200 })
    }
    if (path.includes("/snapshot/")) {
      return new Response(JSON.stringify([{ job_title: "Dev" }]), {
        status: 200,
      })
    }
    throw new Error(`Unexpected URL: ${url}`)
  }) as typeof fetch

  const data = await fetchLinkedInDiscover(
    { keyword: "developer", location: "Paris", country: "FR" },
    fetchImpl,
  )

  assert.deepEqual(data, [{ job_title: "Dev" }])
})

test("triggerLinkedInDiscover throws when BRIGHT_DATA_KEY is missing", async () => {
  delete process.env.BRIGHT_DATA_KEY

  await assert.rejects(
    () => triggerLinkedInDiscover({ keyword: "developer" }),
    /Missing environment variable BRIGHT_DATA_KEY/,
  )
})

test("pollBrightDataSnapshot times out after max attempts", async () => {
  process.env.BRIGHT_DATA_KEY = "test-bright-data-key"

  const fetchImpl = (async () =>
    new Response(JSON.stringify({ status: "running" }), { status: 200 })) as typeof fetch

  await assert.rejects(
    () =>
      pollBrightDataSnapshot("sd_test123", fetchImpl, {
        maxAttempts: 2,
        pollIntervalMs: 0,
      }),
    /timed out/,
  )
})
