import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { jobspressoQuerySchema } from "./schema.ts"

export const jobspressoAdapter = {
  querySchema: jobspressoQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("rss", "jobspresso", jobspressoAdapter)
