import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { fetchPayload } from "./fetch.ts"
import { buildQuery } from "./query.ts"
import { linkedinQuerySchema } from "./schema.ts"

export const linkedinAdapter = {
  querySchema: linkedinQuerySchema,
  buildQuery,
  adapt,
  fetchPayload,
}

registerAdapter("external-scraper", "linkedin", linkedinAdapter)
