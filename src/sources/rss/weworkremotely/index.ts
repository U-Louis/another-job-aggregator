import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { weworkremotelyQuerySchema } from "./schema.ts"

export const weworkremotelyAdapter = {
  querySchema: weworkremotelyQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("rss", "weworkremotely", weworkremotelyAdapter)
