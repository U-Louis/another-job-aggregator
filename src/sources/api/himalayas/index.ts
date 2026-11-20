import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { himalayasQuerySchema } from "./schema.ts"

export const himalayasAdapter = {
  querySchema: himalayasQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("api", "himalayas", himalayasAdapter)
