import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { ErrorLog, writeErrorLogIfNonEmpty } from "./error-log.ts"

test("ErrorLog formats scope and message on separate lines", () => {
  const log = new ErrorLog()
  log.addSource("adzuna-remote", "HTTP 404")
  log.add("notion", "Missing NOTION_TOKEN")

  assert.equal(
    log.format(),
    "adzuna-remote: HTTP 404\nnotion: Missing NOTION_TOKEN\n",
  )
})

test("writeErrorLogIfNonEmpty skips empty logs", () => {
  const dir = mkdtempSync(join(tmpdir(), "aja-error-log-"))
  try {
    const path = join(dir, "errors.log")
    const written = writeErrorLogIfNonEmpty(path, new ErrorLog())
    assert.equal(written, false)
    assert.throws(() => readFileSync(path, "utf8"))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("writeErrorLogIfNonEmpty writes non-empty logs", () => {
  const dir = mkdtempSync(join(tmpdir(), "aja-error-log-"))
  try {
    const path = join(dir, "errors.log")
    const log = new ErrorLog()
    log.add("notion", "sync failed")

    const written = writeErrorLogIfNonEmpty(path, log)
    assert.equal(written, true)
    assert.equal(readFileSync(path, "utf8"), "notion: sync failed\n")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
