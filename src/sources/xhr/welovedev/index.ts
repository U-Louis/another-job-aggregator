import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { welovedevQuerySchema } from "./schema.ts"

export const welovedevAdapter = {
  querySchema: welovedevQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("xhr", "welovedev", welovedevAdapter)
