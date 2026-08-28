import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { z } from "zod"
import type { ProviderAdapter } from "../types/adapter.ts"
import type { SourceEntry } from "../types/config.ts"
import { offer } from "../test/job-offer-fixture.ts"
import { fetchAllSources } from "./fetch-service.ts"
import { clearAdapters, registerAdapter } from "../sources/registry.ts"

const provider = "mock-fetch-service"

const mockAdapter: ProviderAdapter<{ term: string }> = {
  querySchema: z.object({ term: z.string() }),
  buildQuery: (query) => ({
    url: `https://example.com/search?q=${encodeURIComponent(query.term)}`,
  }),
  adapt: () => [offer({ title: "Fetched Job", source: "wrong-source" })],
}

const source: SourceEntry = {
  id: "mock-profile",
  type: "api",
  provider,
  enabled: true,
  query: { term: "typescript" },
}

beforeEach(() => clearAdapters())

test("fetchAllSources adapts successful responses per source", async () => {
  registerAdapter("api", provider, mockAdapter)
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ hits: 1 }), { status: 200 })) as typeof fetch

  const results = await fetchAllSources([source], fetchImpl)
  assert.equal(results.length, 1)
  assert.equal(results[0]?.sourceId, "mock-profile")
  assert.equal(results[0]?.ok, true)
  if (results[0]?.ok) {
    assert.equal(results[0].offers.length, 1)
    assert.equal(results[0].offers[0]?.title, "Fetched Job")
    assert.equal(results[0].offers[0]?.source, "mock-profile")
  }
})

test("fetchAllSources skips disabled sources", async () => {
  registerAdapter("api", provider, mockAdapter)
  const fetchImpl = (async () =>
    new Response("{}", { status: 200 })) as typeof fetch

  const results = await fetchAllSources(
    [source, { ...source, id: "disabled-profile", enabled: false }],
    fetchImpl,
  )

  assert.equal(results.length, 1)
  assert.equal(results[0]?.sourceId, "mock-profile")
})

test("fetchAllSources collects per-source errors without aborting others", async () => {
  registerAdapter("api", provider, mockAdapter)
  const fetchImpl = (async (url) => {
    if (String(url).includes("bad")) {
      return new Response("nope", { status: 404, statusText: "Not Found" })
    }
    return new Response("{}", { status: 200 })
  }) as typeof fetch

  const badSource: SourceEntry = {
    ...source,
    id: "bad-profile",
    query: { term: "bad" },
  }

  const results = await fetchAllSources(
    [badSource, { ...source, id: "good-profile", query: { term: "good" } }],
    fetchImpl,
  )

  assert.equal(results.length, 2)
  assert.equal(results[0]?.ok, false)
  assert.match(String(!results[0]?.ok && results[0].error), /404/)
  assert.equal(results[1]?.ok, true)
})

test("fetchAllSources continues other sources when one adapt fails", async () => {
  registerAdapter("api", provider, {
    ...mockAdapter,
    adapt: () => {
      throw new Error("adapt failed")
    },
  })

  const fetchImpl = (async () =>
    new Response("{}", { status: 200 })) as typeof fetch

  const results = await fetchAllSources(
    [source, { ...source, id: "second" }],
    fetchImpl,
  )

  assert.equal(results.length, 2)
  assert.equal(results.every((result) => !result.ok), true)
})
