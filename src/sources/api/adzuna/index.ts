import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { adzunaQuerySchema } from "./schema.ts"

export const adzunaAdapter = {
  querySchema: adzunaQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("api", "adzuna", adzunaAdapter)
