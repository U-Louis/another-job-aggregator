import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { wttjQuerySchema } from "./schema.ts"

export const wttjAdapter = {
  querySchema: wttjQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("xhr", "wttj", wttjAdapter)
