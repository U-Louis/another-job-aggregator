import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { z } from "zod"
import type { ProviderAdapter } from "../types/adapter.ts"
import type { SourceEntry } from "../types/config.ts"
import { buildFetchPlan, buildFetchPlans } from "./query-builder.ts"
import { clearAdapters, registerAdapter } from "../sources/registry.ts"

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

beforeEach(() => clearAdapters())

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

test("buildFetchPlans maps enabled source entries", () => {
  registerAdapter("api", provider, mockAdapter)
  const plans = buildFetchPlans([source, { ...source, id: "other" }])
  assert.equal(plans.length, 2)
  assert.equal(plans[1]?.sourceId, "other")
})

test("buildFetchPlans skips disabled sources", () => {
  registerAdapter("api", provider, mockAdapter)
  const plans = buildFetchPlans([
    source,
    { ...source, id: "disabled", enabled: false },
  ])
  assert.equal(plans.length, 1)
  assert.equal(plans[0]?.sourceId, "test-source")
})
