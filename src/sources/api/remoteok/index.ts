import { registerAdapter } from "../../registry.ts"
import { adapt } from "./adapt.ts"
import { buildQuery } from "./query.ts"
import { remoteokQuerySchema } from "./schema.ts"

export const remoteokAdapter = {
  querySchema: remoteokQuerySchema,
  buildQuery,
  adapt,
}

registerAdapter("api", "remoteok", remoteokAdapter)
