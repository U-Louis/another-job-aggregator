import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { jtmsQuerySchema } from "./schema.ts"

export const jobsthatmakesenseAdapter = {
  querySchema: jtmsQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("xhr", "jobsthatmakesense", jobsthatmakesenseAdapter)
