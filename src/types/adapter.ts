import type { z } from "zod"
import type { FetchParams } from "./fetch.ts"
import type { JobOffer } from "./job-offer.ts"

export type ProviderAdapter<TQuery = Record<string, unknown>> = {
  querySchema: z.ZodType<TQuery>
  buildQuery: (query: TQuery) => FetchParams
  adapt: (rawPayload: unknown, sourceId: string) => JobOffer[]
}
