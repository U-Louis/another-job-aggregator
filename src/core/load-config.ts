import { readFileSync } from "node:fs"
import { parse } from "yaml"
import { ZodError } from "zod"
import { configSchema, type Config } from "../types/config.ts"

export function loadConfig(path: string): Config {
  let raw: string
  try {
    raw = readFileSync(path, "utf8")
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read config ${path}: ${reason}`)
  }

  let parsed: unknown
  try {
    parsed = parse(raw)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse YAML ${path}: ${reason}`)
  }

  try {
    return configSchema.parse(parsed)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(`Invalid config ${path}:\n${err.message}`)
    }
    throw err
  }
}
