import assert from "node:assert/strict"
import { test } from "node:test"
import { z } from "zod"
import type { ProviderAdapter } from "../types/adapter.ts"
import type { SourceEntry } from "../types/config.ts"
import { buildFetchPlan, buildFetchPlans } from "./query-builder.ts"
import { getAdapter, registerAdapter } from "../sources/registry.ts"

const provider = "mock-query-builder"

const mockAdapter: ProviderAdapter<{ term: string }> = {
  querySchema: z.object({ term: z.string() }),
  buildQuery: (query) => ({
    url: `https://example.com/search?q=${encodeURIComponent(query.term)}`,
  }),
  adapt: () => [],
}

const source: SourceEntry = {
  id: "test-source",
  type: "api",
  provider,
  enabled: true,
  query: { term: "typescript" },
}

test("buildFetchPlan validates query and builds fetch params", () => {
  registerAdapter("api", provider, mockAdapter)
  const plan = buildFetchPlan(source)

  assert.equal(plan.sourceId, "test-source")
  assert.equal(plan.type, "api")
  assert.equal(plan.provider, provider)
  assert.equal(plan.params.url, "https://example.com/search?q=typescript")
  assert.equal(plan.adapter, mockAdapter)
})

test("buildFetchPlan rejects invalid provider queries", () => {
  registerAdapter("api", provider, mockAdapter)
  assert.throws(
    () =>
      buildFetchPlan({
        ...source,
        query: {},
      }),
    /Required/,
  )
})

test("buildFetchPlans maps every source entry", () => {
  registerAdapter("api", provider, mockAdapter)
  const plans = buildFetchPlans([source, { ...source, id: "other" }])
  assert.equal(plans.length, 2)
  assert.equal(plans[1]?.sourceId, "other")
})

test("getAdapter throws for unknown providers", () => {
  assert.throws(
    () => getAdapter("api", "definitely-missing-provider"),
    /Unknown provider "definitely-missing-provider"/,
  )
})
