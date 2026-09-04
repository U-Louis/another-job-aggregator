import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { remotiveQuerySchema } from "./schema.ts"

export const remotiveAdapter = {
  querySchema: remotiveQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("api", "remotive", remotiveAdapter)
