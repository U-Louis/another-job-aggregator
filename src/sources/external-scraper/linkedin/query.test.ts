import assert from "node:assert/strict"
import { test } from "node:test"
import { LINKEDIN_JOBS_DATASET_ID } from "../brightdata.ts"
import { buildDiscoverInput, buildQuery } from "./query.ts"

test("buildDiscoverInput maps query fields to Bright Data discover input", () => {
  const input = buildDiscoverInput({
    keyword: "typescript developer",
    location: "France",
    country: "FR",
    remote: "Remote",
    time_range: "Past week",
    job_type: "Full-time",
    experience_level: "Mid-Senior level",
  })

  assert.deepEqual(input, {
    keyword: "typescript developer",
    location: "France",
    country: "FR",
    remote: "Remote",
    time_range: "Past week",
    job_type: "Full-time",
    experience_level: "Mid-Senior level",
  })
})

test("buildDiscoverInput omits post-fetch filter fields", () => {
  const input = buildDiscoverInput({
    keyword: "Software Engineer",
    location: "Paris",
    country: "FR",
    what_or: "typescript symfony",
    what_or_remote: "remote télétravail",
    what_exclude_remote: "partiel",
  })

  assert.deepEqual(input, {
    keyword: "Software Engineer",
    location: "Paris",
    country: "FR",
  })
})

test("buildQuery points at the Bright Data LinkedIn trigger endpoint", () => {
  const params = buildQuery({
    keyword: "typescript developer",
    location: "France",
    country: "FR",
  })

  const url = new URL(params.url)

  assert.equal(url.hostname, "api.brightdata.com")
  assert.equal(url.searchParams.get("dataset_id"), LINKEDIN_JOBS_DATASET_ID)
  assert.equal(url.searchParams.get("type"), "discover_new")
  assert.equal(url.searchParams.get("discover_by"), "keyword")
  assert.equal(params.method, "POST")
})
