import type { FetchParams } from "../../../types/fetch.ts"
import {
  BRIGHTDATA_API_BASE,
  LINKEDIN_JOBS_DATASET_ID,
  type BrightDataDiscoverInput,
} from "../brightdata.ts"
import {
  linkedinQuerySchema,
  type LinkedInQuery,
} from "./schema.ts"

export function buildDiscoverInput(query: LinkedInQuery): BrightDataDiscoverInput {
  const parsed = linkedinQuerySchema.parse(query)
  const input: BrightDataDiscoverInput = {
    keyword: parsed.keyword,
  }

  if (parsed.location !== undefined) {
    input.location = parsed.location
  }
  if (parsed.country !== undefined) {
    input.country = parsed.country
  }
  if (parsed.remote !== undefined) {
    input.remote = parsed.remote
  }
  if (parsed.time_range !== undefined) {
    input.time_range = parsed.time_range
  }
  if (parsed.job_type !== undefined) {
    input.job_type = parsed.job_type
  }
  if (parsed.experience_level !== undefined) {
    input.experience_level = parsed.experience_level
  }

  return input
}

export function buildQuery(_query: LinkedInQuery): FetchParams {
  linkedinQuerySchema.parse(_query)
  const url = new URL(`${BRIGHTDATA_API_BASE}/trigger`)
  url.searchParams.set("dataset_id", LINKEDIN_JOBS_DATASET_ID)
  url.searchParams.set("type", "discover_new")
  url.searchParams.set("discover_by", "keyword")

  return {
    url: url.toString(),
    method: "POST",
  }
}
