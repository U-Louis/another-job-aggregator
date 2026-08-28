import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { clearAdapters, getAdapter } from "./registry.ts"

beforeEach(() => clearAdapters())

test("getAdapter throws for unknown providers", () => {
  assert.throws(
    () => getAdapter("api", "definitely-missing-provider"),
    /Unknown provider "definitely-missing-provider"/,
  )
})
