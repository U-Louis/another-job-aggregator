import { buildFetchPlan } from "../../core/query-builder.ts"
import type { SourceEntry } from "../../types/config.ts"
import type { FetchParams } from "../../types/fetch.ts"
import { hasAdapter } from "../../sources/registry.ts"
import { buildAdzunaCaptureQuery } from "./adzuna.ts"

type CaptureBuilder = (query: Record<string, unknown>) => FetchParams

const captureBuilders: Partial<Record<string, Partial<Record<string, CaptureBuilder>>>> = {
  api: {
    adzuna: buildAdzunaCaptureQuery,
  },
}

export function buildCaptureParams(source: SourceEntry): FetchParams {
  if (hasAdapter(source.type, source.provider)) {
    return buildFetchPlan(source).params
  }

  const builder = captureBuilders[source.type]?.[source.provider]
  if (!builder) {
    throw new Error(
      `No capture builder for provider "${source.provider}" (type "${source.type}")`,
    )
  }

  return builder(source.query)
}
