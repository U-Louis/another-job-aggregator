import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { buildQuery } from "./query.ts"

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

test("buildQuery builds the search URL with auth and filters", () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const params = buildQuery({
    country: "fr",
    what: "typescript",
    where: "paris",
    what_exclude: "intern",
  })

  const url = new URL(params.url)
  assert.equal(
    url.origin + url.pathname,
    "https://api.adzuna.com/v1/api/jobs/fr/search/1",
  )
  assert.equal(url.searchParams.get("app_id"), "test-app-id")
  assert.equal(url.searchParams.get("app_key"), "test-app-key")
  assert.equal(url.searchParams.get("results_per_page"), "50")
  assert.equal(url.searchParams.get("what"), "typescript")
  assert.equal(url.searchParams.get("where"), "paris")
  assert.equal(url.searchParams.get("what_exclude"), "intern")
})

test("buildQuery omits optional filters when absent", () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const params = buildQuery({ country: "fr" })
  const url = new URL(params.url)

  assert.equal(url.searchParams.get("what"), null)
  assert.equal(url.searchParams.get("where"), null)
  assert.equal(url.searchParams.get("what_exclude"), null)
})

test("buildQuery requires Adzuna credentials", () => {
  delete process.env.ADZUNA_APP_ID
  delete process.env.ADZUNA_APP_KEY

  assert.throws(
    () => buildQuery({ country: "fr" }),
    /Missing environment variable ADZUNA_APP_ID/,
  )
})

test("buildQuery rejects invalid query shape", () => {
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  assert.throws(
    () => buildQuery({} as { country: string }),
    /Required/,
  )
})
