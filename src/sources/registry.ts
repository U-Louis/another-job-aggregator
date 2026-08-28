import type { ProviderAdapter } from "../types/adapter.ts"
import type { SourceType } from "../types/config.ts"

const adapters: Record<SourceType, Record<string, ProviderAdapter>> = {
  api: {},
  rss: {},
  xhr: {},
  "external-scraper": {},
}

export function registerAdapter(
  type: SourceType,
  provider: string,
  adapter: ProviderAdapter,
): void {
  adapters[type][provider] = adapter
}

export function getAdapter(type: SourceType, provider: string): ProviderAdapter {
  const adapter = adapters[type][provider]
  if (!adapter) {
    throw new Error(`Unknown provider "${provider}" for source type "${type}"`)
  }
  return adapter
}

/** @internal test helper — reset registry between tests */
export function clearAdapters(type?: SourceType): void {
  if (type) {
    adapters[type] = {}
    return
  }
  for (const key of Object.keys(adapters) as SourceType[]) {
    adapters[key] = {}
  }
}
