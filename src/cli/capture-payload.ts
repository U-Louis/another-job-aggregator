import { mkdirSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { loadConfig } from "../core/load-config.ts"
import { fetchByType } from "../sources/fetch-by-type.ts"
import type { SourceEntry, SourceType } from "../types/config.ts"
import { buildCaptureParams } from "./capture/index.ts"

export function profileNameFromConfPath(confPath: string): string {
  const base = basename(confPath)
  return base.replace(/\.(ya?ml)$/i, "")
}

export function fixturePath(type: SourceType, provider: string, profile: string): string {
  return join("src", "sources", type, provider, "fixtures", `${profile}.json`)
}

export type CaptureResult = {
  sourceId: string
  provider: string
  profile: string
  path: string
}

export async function capturePayloadForSource(
  source: SourceEntry,
  profile: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CaptureResult> {
  const params = buildCaptureParams(source)
  const rawPayload = await fetchByType(source.type, params, fetchImpl)
  const path = fixturePath(source.type, source.provider, profile)

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(rawPayload, null, 2)}\n`, "utf8")

  return {
    sourceId: source.id,
    provider: source.provider,
    profile,
    path,
  }
}

export async function capturePayload(
  confPath: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CaptureResult[]> {
  const config = loadConfig(confPath)
  const enabled = config.sources.filter((source) => source.enabled)

  if (enabled.length === 0) {
    throw new Error(`No enabled sources in ${confPath}`)
  }

  const profile = profileNameFromConfPath(confPath)
  const results: CaptureResult[] = []

  for (const source of enabled) {
    results.push(await capturePayloadForSource(source, profile, fetchImpl))
  }

  return results
}
