import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildAlgoliaUrl,
  buildFacetFilters,
  buildFilters,
  buildQuery,
  buildSearchBody,
  cityFromWhere,
  WTTJ_ALGOLIA_APP_ID,
  WTTJ_ALGOLIA_API_KEY,
} from "./query.ts"

test("buildQuery posts to the WTTJ Algolia index with browser headers", () => {
  const params = buildQuery({
    query: "typescript",
    locale: "fr",
    country_code: "FR",
    remote: "fulltime",
  })

  assert.equal(
    params.url,
    "https://csekhvms53-dsn.algolia.net/1/indexes/wttj_jobs_production_fr/query",
  )
  assert.equal(params.method, "POST")
  assert.equal(params.headers?.["x-algolia-application-id"], WTTJ_ALGOLIA_APP_ID)
  assert.equal(params.headers?.["x-algolia-api-key"], WTTJ_ALGOLIA_API_KEY)
  assert.equal(params.headers?.Origin, "https://www.welcometothejungle.com")
  assert.equal(params.headers?.Referer, "https://www.welcometothejungle.com/")

  const body = JSON.parse(String(params.body))
  assert.equal(body.query, "typescript")
  assert.equal(body.hitsPerPage, 30)
  assert.equal(body.page, 0)
  assert.equal(body.filters, "remote:fulltime")
  assert.deepEqual(body.facetFilters, [["offices.country_code:FR"]])
})

test("buildFilters omits absent filters", () => {
  assert.equal(buildFilters({ locale: "fr" }), undefined)
  assert.equal(buildFilters({ locale: "fr", remote: "fulltime" }), "remote:fulltime")
})

test("buildFilters supports excluding a remote policy", () => {
  assert.equal(
    buildFilters({ locale: "fr", exclude_remote: "fulltime" }),
    "NOT remote:fulltime",
  )
})

test("cityFromWhere uses the first location token", () => {
  assert.equal(cityFromWhere("caen normandie"), "Caen")
})

test("buildFacetFilters maps country and where to Algolia office facets", () => {
  assert.deepEqual(
    buildFacetFilters({ locale: "fr", country_code: "FR", where: "caen normandie" }),
    [["offices.country_code:FR"], ["offices.city:Caen"]],
  )
})

test("buildSearchBody increments the Algolia page", () => {
  const body = JSON.parse(buildSearchBody({ locale: "en", query: "data" }, 2))
  assert.equal(body.page, 2)
  assert.equal(buildAlgoliaUrl("en"), "https://csekhvms53-dsn.algolia.net/1/indexes/wttj_jobs_production_en/query")
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
