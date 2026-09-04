import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { adzunaQuerySchema } from "./schema.ts"

export const adzunaAdapter = {
  querySchema: adzunaQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("api", "adzuna", adzunaAdapter)
