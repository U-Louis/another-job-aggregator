import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { hackernewsQuerySchema } from "./schema.ts"

export const hackernewsAdapter = {
  querySchema: hackernewsQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("api", "hackernews", hackernewsAdapter)
