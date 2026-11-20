import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { larajobsQuerySchema } from "./schema.ts"

export const larajobsAdapter = {
  querySchema: larajobsQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("api", "larajobs", larajobsAdapter)
