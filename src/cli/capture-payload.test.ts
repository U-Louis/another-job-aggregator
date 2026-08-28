import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import {
  capturePayload,
  capturePayloadForSource,
  fixturePath,
  profileNameFromConfPath,
} from "./capture-payload.ts"

const originalCwd = process.cwd()
const tempDirs: string[] = []

afterEach(() => {
  process.chdir(originalCwd)
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function makeWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "aja-test-payload-"))
  tempDirs.push(dir)
  process.chdir(dir)
  return dir
}

function writeConf(name: string, contents: string): string {
  const confDir = join(process.cwd(), "configs")
  mkdirSync(confDir, { recursive: true })
  writeFileSync(join(confDir, name), contents, { utf8: true })
  return join("configs", name)
}

const adzunaSourceConf = `
sources:
  - id: adzuna-remote
    type: api
    provider: adzuna
    enabled: true
    query:
      country: fr
      what: typescript
      where: paris
      what_exclude: intern
`

test("profileNameFromConfPath strips yaml extension", () => {
  assert.equal(profileNameFromConfPath("configs/adzuna-remote.yaml"), "adzuna-remote")
  assert.equal(profileNameFromConfPath("configs/adzuna-remote.yml"), "adzuna-remote")
})

test("fixturePath follows provider/profile layout", () => {
  assert.equal(
    fixturePath("adzuna", "adzuna-remote"),
    "src/sources/api/adzuna/fixtures/adzuna-remote.json",
  )
})

test("capturePayloadForSource writes fetched JSON to the fixture path", async () => {
  makeWorkspace()
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const fetchImpl = (async () =>
    new Response(JSON.stringify({ results: [{ id: "job-1" }] }), {
      status: 200,
    })) as typeof fetch

  const result = await capturePayloadForSource(
    {
      id: "adzuna-remote",
      type: "api",
      provider: "adzuna",
      enabled: true,
      query: {
        country: "fr",
        what: "typescript",
      },
    },
    "adzuna-remote",
    fetchImpl,
  )

  assert.equal(result.path, "src/sources/api/adzuna/fixtures/adzuna-remote.json")
  const written = JSON.parse(readFileSync(result.path, "utf8")) as {
    results: Array<{ id: string }>
  }
  assert.equal(written.results[0]?.id, "job-1")
})

test("capturePayload captures all enabled sources from a conf file", async () => {
  makeWorkspace()
  process.env.ADZUNA_APP_ID = "test-app-id"
  process.env.ADZUNA_APP_KEY = "test-app-key"

  const confPath = writeConf("adzuna-remote.yaml", adzunaSourceConf)
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ count: 1 }), { status: 200 })) as typeof fetch

  const results = await capturePayload(confPath, fetchImpl)

  assert.equal(results.length, 1)
  assert.equal(results[0]?.sourceId, "adzuna-remote")
  assert.equal(results[0]?.profile, "adzuna-remote")
  assert.equal(readFileSync(results[0]!.path, "utf8").includes('"count": 1'), true)
})

test("capturePayload rejects conf files with no enabled sources", async () => {
  makeWorkspace()
  const confPath = writeConf(
    "disabled.yaml",
    adzunaSourceConf.replace("enabled: true", "enabled: false"),
  )

  await assert.rejects(
    () => capturePayload(confPath),
    /No enabled sources/,
  )
})
