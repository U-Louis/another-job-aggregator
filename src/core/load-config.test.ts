import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import assert from "node:assert/strict"
import { test } from "node:test"
import { loadConfig } from "./load-config.ts"

function writeConf(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "aja-conf-"))
  const path = join(dir, "conf.yaml")
  writeFileSync(path, contents)
  return path
}

const validSource = `
sources:
  - id: adzuna-remote
    type: api
    provider: adzuna
    enabled: true
    query:
      country: fr
      what: typescript
`

test("loadConfig parses a valid profile and defaults forbiddenStrings to []", () => {
  const path = writeConf(validSource)
  const config = loadConfig(path)

  assert.deepEqual(config.forbiddenStrings, [])
  assert.equal(config.sources.length, 1)
  assert.equal(config.sources[0]?.id, "adzuna-remote")
  assert.equal(config.sources[0]?.type, "api")
  assert.equal(config.sources[0]?.provider, "adzuna")
  assert.equal(config.sources[0]?.enabled, true)
  assert.deepEqual(config.sources[0]?.query, {
    country: "fr",
    what: "typescript",
  })
})

test("loadConfig reads forbiddenStrings when present", () => {
  const path = writeConf(`
forbiddenStrings:
  - intern
  - stage
${validSource}
`)
  const config = loadConfig(path)
  assert.deepEqual(config.forbiddenStrings, ["intern", "stage"])
})

test("loadConfig rejects an unknown source type", () => {
  const path = writeConf(`
sources:
  - id: weird
    type: ftp
    provider: x
    enabled: true
    query: {}
`)
  assert.throws(() => loadConfig(path), /Invalid config/)
})

test("loadConfig rejects a missing file", () => {
  assert.throws(
    () => loadConfig("/tmp/does-not-exist-aja-conf.yaml"),
    /Failed to read config/,
  )
})
