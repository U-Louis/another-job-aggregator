import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parse } from "yaml"
import { ZodError } from "zod"
import {
  configSchema,
  forbiddenStringsFileSchema,
  rawConfigSchema,
  type Config,
} from "../types/config.ts"

function readYaml(path: string): unknown {
  let raw: string
  try {
    raw = readFileSync(path, "utf8")
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read config ${path}: ${reason}`)
  }

  try {
    return parse(raw)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse YAML ${path}: ${reason}`)
  }
}

function parseWithSchema<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
): T {
  try {
    return schema.parse(readYaml(path))
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(`Invalid config ${path}:\n${err.message}`)
    }
    throw err
  }
}

function mergeForbiddenStrings(base: string[], extra: string[]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const term of [...base, ...extra]) {
    if (seen.has(term)) continue
    seen.add(term)
    merged.push(term)
  }
  return merged
}

function resolveForbiddenStrings(
  profilePath: string,
  raw: ReturnType<typeof rawConfigSchema.parse>,
): string[] {
  let base: string[] = []
  if (raw.forbiddenStringsFrom) {
    const sharedPath = resolve(dirname(profilePath), raw.forbiddenStringsFrom)
    const shared = parseWithSchema(sharedPath, forbiddenStringsFileSchema)
    base = shared.forbiddenStrings
  }
  return mergeForbiddenStrings(base, raw.forbiddenStrings)
}

export function loadConfig(path: string): Config {
  const raw = parseWithSchema(path, rawConfigSchema)
  const forbiddenStrings = resolveForbiddenStrings(path, raw)

  return configSchema.parse({
    forbiddenStrings,
    sources: raw.sources,
  })
}
