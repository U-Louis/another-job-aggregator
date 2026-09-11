import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildFilters,
  buildQuery,
  buildSearchBody,
  searchTextFromQuery,
  WELOVEDEV_INDEX,
  WELOVEDEV_ORIGIN,
  WELOVEDEV_SEARCH_BASE,
} from "./query.ts"

test("buildQuery posts to the WeLoveDevs search proxy with text/plain", () => {
  const params = buildQuery({
    query: "typescript",
    where: "caen normandie",
    exclude_remote: "fullTime",
  })

  assert.equal(params.url, `${WELOVEDEV_SEARCH_BASE}/poc`)
  assert.equal(params.method, "POST")
  assert.equal(params.headers?.["Content-Type"], "text/plain")
  assert.equal(params.headers?.Origin, WELOVEDEV_ORIGIN)
  assert.equal(params.headers?.Referer, `${WELOVEDEV_ORIGIN}/app/jobs`)

  const body = JSON.parse(String(params.body))
  assert.equal(body.length, 1)
  assert.equal(body[0].indexName, WELOVEDEV_INDEX)
  assert.equal(body[0].query, "typescript")

  const searchParams = new URLSearchParams(body[0].params)
  assert.equal(searchParams.get("hitsPerPage"), "20")
  assert.equal(searchParams.get("page"), "0")
  assert.equal(
    searchParams.get("filters"),
    "NOT details.remotePolicy.frequency:fullTime",
  )
})

test("searchTextFromQuery uses query only; where is reserved for conf parity", () => {
  assert.equal(
    searchTextFromQuery({ query: "développeur", where: "caen normandie" }),
    "développeur",
  )
  assert.equal(searchTextFromQuery({ query: "typescript" }), "typescript")
})

test("buildFilters supports remote and exclude_remote", () => {
  assert.equal(buildFilters({ remote: "fullTime" }), "details.remotePolicy.frequency:fullTime")
  assert.equal(
    buildFilters({ exclude_remote: "fullTime" }),
    "NOT details.remotePolicy.frequency:fullTime",
  )
  assert.equal(buildFilters({}), undefined)
})

test("buildSearchBody maps geo params for optional location filtering", () => {
  const body = JSON.parse(
    buildSearchBody({
      query: "développeur",
      around_lat: 49.182863,
      around_lng: -0.370679,
      around_radius: 50_000,
    }),
  )
  const searchParams = new URLSearchParams(body[0].params)

  assert.equal(searchParams.get("aroundLatLng"), "49.182863,-0.370679")
  assert.equal(searchParams.get("aroundRadius"), "50000")
})

test("buildQuery ignores post-fetch filter fields", () => {
  const params = buildQuery({
    what_or: "typescript react",
    what_or_remote: "remote",
    what_exclude_remote: "partiel",
  })
  const body = JSON.parse(String(params.body))

  assert.equal(body[0].what_or, undefined)
})
