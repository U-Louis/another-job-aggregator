import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { symfonyQuerySchema } from "./schema.ts"

export const symfonyAdapter = {
  querySchema: symfonyQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("rss", "symfony", symfonyAdapter)
