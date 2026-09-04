import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { fetchPayload } from "./fetch.ts"
import {
  ADZUNA_DEFAULT_MAX_PAGES,
  ADZUNA_RESULTS_PER_PAGE,
  buildSearchUrl,
} from "./query.ts"

const originalEnv = {
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
}

afterEach(() => {
  if (originalEnv.ADZUNA_APP_ID === undefined) {
    delete process.env.ADZUNA_APP_ID
  } else {
    process.env.ADZUNA_APP_ID = originalEnv.ADZUNA_APP_ID
  }
  if (originalEnv.ADZUNA_APP_KEY === undefined) {
    delete process.env.ADZUNA_APP_KEY
  } else {
    process.env.ADZUNA_APP_KEY = originalEnv.ADZUNA_APP_KEY
  }
})

function makeJob(id: number) {
  return {
    title: `Job ${id}`,
    redirect_url: `https://www.adzuna.fr/details/${id}`,
    created: "2026-01-01T00:00:00Z",
    description: "Desc",
    location: { display_name: "Paris" },
  }
}

function makeResponse(count: number) {
  return {
    count: 500,
    results: Array.from({ length: count }, (_, index) => makeJob(index + 1)),
  }
}

test("fetchPayload fetches multiple pages up to max_pages", async () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const requestedPages: number[] = []
  const fetchImpl = (async (url) => {
    const page = Number(new URL(String(url)).pathname.split("/").at(-1))
    requestedPages.push(page)
    return new Response(JSON.stringify(makeResponse(ADZUNA_RESULTS_PER_PAGE)), {
      status: 200,
    })
  }) as typeof fetch

  const payload = await fetchPayload(
    { country: "fr", what: "typescript", max_pages: 3 },
    fetchImpl,
  )

  assert.deepEqual(requestedPages, [1, 2, 3])
  assert.equal((payload as { results: unknown[] }).results.length, 150)
})

test("fetchPayload stops early when a page returns fewer than 50 results", async () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const fetchImpl = (async (url) => {
    const page = Number(new URL(String(url)).pathname.split("/").at(-1))
    const count = page === 1 ? ADZUNA_RESULTS_PER_PAGE : 12
    return new Response(JSON.stringify(makeResponse(count)), { status: 200 })
  }) as typeof fetch

  const payload = await fetchPayload(
    { country: "fr", what: "typescript", max_pages: 5 },
    fetchImpl,
  )

  assert.equal((payload as { results: unknown[] }).results.length, 62)
})

test("fetchPayload defaults to three pages", async () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  let pageCount = 0
  const fetchImpl = (async () => {
    pageCount += 1
    return new Response(JSON.stringify(makeResponse(ADZUNA_RESULTS_PER_PAGE)), {
      status: 200,
    })
  }) as typeof fetch

  await fetchPayload({ country: "fr", what: "typescript" }, fetchImpl)

  assert.equal(pageCount, ADZUNA_DEFAULT_MAX_PAGES)
})

test("buildSearchUrl uses the page number in the path", () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const url = new URL(buildSearchUrl({ country: "fr", what: "typescript" }, 2))

  assert.equal(url.pathname, "/v1/api/jobs/fr/search/2")
  assert.equal(url.searchParams.get("results_per_page"), "50")
})
