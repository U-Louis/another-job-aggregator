import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import { readCreatedPages, writeCreatedPages } from "./created-pages.ts"

test("readCreatedPages joins every source file and ignores a missing directory", () => {
  assert.deepEqual(readCreatedPages(join(tmpdir(), "missing-review-created")), [])

  const dir = mkdtempSync(join(tmpdir(), "review-created-"))
  const firstDir = join(dir, "review-adzuna")
  const secondDir = join(dir, "review-hn")
  mkdirSync(firstDir)
  mkdirSync(secondDir)
  const fresh = {
    pageId: "page-1",
    offer: offer({ title: "Engineer", company: "Acme" }),
  }
  writeCreatedPages(join(firstDir, "review-created.json"), [fresh])
  writeCreatedPages(join(secondDir, "review-created.json"), [])

  assert.deepEqual(readCreatedPages(dir), [fresh])
})
