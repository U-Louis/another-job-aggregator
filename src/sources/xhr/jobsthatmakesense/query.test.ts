import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildAlgoliaUrl,
  buildFilters,
  buildQuery,
  buildSearchBody,
  indexNameForSort,
  JTMS_ALGOLIA_APP_ID,
  JTMS_ALGOLIA_API_KEY,
  JTMS_ORIGIN,
} from "./query.ts"

test("buildQuery posts to the JTMS Algolia index with browser headers", () => {
  const params = buildQuery({
    query: "développeur",
    locale: "fr",
    region: "eu",
    remote: "full",
  })

  assert.equal(
    params.url,
    "https://3pwoxb8rr8-dsn.algolia.net/1/indexes/prod_JOBS_relevance/query",
  )
  assert.equal(params.method, "POST")
  assert.equal(params.headers?.["x-algolia-application-id"], JTMS_ALGOLIA_APP_ID)
  assert.equal(params.headers?.["x-algolia-api-key"], JTMS_ALGOLIA_API_KEY)
  assert.equal(params.headers?.Origin, JTMS_ORIGIN)
  assert.equal(params.headers?.Referer, `${JTMS_ORIGIN}/`)

  const body = JSON.parse(String(params.body))
  assert.equal(body.query, "développeur")
  assert.equal(body.hitsPerPage, 20)
  assert.equal(body.page, 0)
  assert.equal(body.filters, "region:eu AND remote:full")
})

test("buildFilters supports excluding a remote policy", () => {
  assert.equal(
    buildFilters({ locale: "fr", exclude_remote: "full" }),
    "region:eu AND NOT remote:full",
  )
})

test("buildSearchBody adds geo params when coordinates are present", () => {
  const body = JSON.parse(
    buildSearchBody(
      {
        locale: "fr",
        query: "typescript",
        around_lat: 49.182863,
        around_lng: -0.370679,
        around_radius: 50_000,
      },
      1,
    ),
  )

  assert.equal(body.page, 1)
  assert.equal(body.aroundLatLng, "49.182863,-0.370679")
  assert.equal(body.aroundRadius, 50_000)
})

test("indexNameForSort maps date sorting to the date index", () => {
  assert.equal(indexNameForSort(undefined), "prod_JOBS_relevance")
  assert.equal(indexNameForSort("date"), "prod_JOBS_date")
  assert.equal(
    buildAlgoliaUrl("date"),
    "https://3pwoxb8rr8-dsn.algolia.net/1/indexes/prod_JOBS_date/query",
  )
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })
  const body = JSON.parse(String(params.body))

  assert.equal(body.what_or, undefined)
  assert.equal(body.what_or_remote, undefined)
  assert.equal(body.what_exclude_remote, undefined)
})
