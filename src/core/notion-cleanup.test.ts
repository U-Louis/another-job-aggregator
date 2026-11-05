import assert from "node:assert/strict"
import { test } from "node:test"
import {
  deleteStalePages,
  staleCutoff,
  STALE_PAGE_AGE_MS,
  type CleanupSummary,
} from "./notion-cleanup.ts"
import type { NotionSyncClient } from "./notion-sync.ts"

const NOW = new Date("2026-03-05T12:00:00.000Z")
const CUTOFF = "2026-02-03T12:00:00.000Z"

function page(
  id: string,
  createdTime: string,
  status: string | null = "archived",
  extra: Record<string, unknown> = {},
) {
  return {
    object: "page",
    id,
    url: `https://notion.so/${id}`,
    created_time: createdTime,
    archived: false,
    in_trash: false,
    properties: {
      Status: {
        type: "select",
        select: status === null ? null : { name: status },
        id: "status",
      },
    },
    ...extra,
  }
}

test("staleCutoff is 30 days before now", () => {
  assert.equal(STALE_PAGE_AGE_MS, 30 * 24 * 60 * 60 * 1000)
  assert.equal(staleCutoff(NOW).toISOString(), CUTOFF)
})

test("deleteStalePages trashes archived pages created more than 30 days ago", async () => {
  const queries: unknown[] = []
  const trashed: string[] = []
  const client = {
    databases: {
      query: async (args: { start_cursor?: string }) => {
        queries.push(args)
        if (!args.start_cursor) {
          return {
            object: "list",
            results: [
              page("old", "2026-01-01T00:00:00.000Z"),
              page("interesting", "2026-01-01T00:00:00.000Z", "interesting"),
              page("selected", "2026-01-01T00:00:00.000Z", "selected"),
              page("unset", "2026-01-01T00:00:00.000Z", null),
              page("boundary", CUTOFF),
              page("recent", "2026-03-01T00:00:00.000Z"),
              page("already-trashed", "2025-01-01T00:00:00.000Z", "archived", { in_trash: true }),
              { object: "page", id: "partial" },
            ],
            has_more: true,
            next_cursor: "cursor-2",
          }
        }
        return {
          object: "list",
          results: [page("older", "2025-12-01T00:00:00.000Z")],
          has_more: false,
          next_cursor: null,
        }
      },
    },
    pages: {
      update: async ({ page_id }: { page_id: string }) => {
        trashed.push(page_id)
        if (page_id === "older") {
          throw new Error("Notion unavailable")
        }
        return { id: page_id }
      },
    },
  } as unknown as NotionSyncClient

  const errors: string[] = []
  const summary: CleanupSummary = await deleteStalePages(
    client,
    "db-1",
    NOW,
    (message) => errors.push(message),
  )

  assert.deepEqual(summary, { deleted: 1, failed: 1 })
  assert.deepEqual(trashed, ["old", "older"])
  assert.deepEqual(errors, ["older: Notion unavailable"])
  assert.equal(queries.length, 2)
  const first = queries[0] as {
    database_id: string
    filter: unknown
  }
  assert.equal(first.database_id, "db-1")
  assert.deepEqual(first.filter, {
    and: [
      {
        timestamp: "created_time",
        created_time: { before: CUTOFF },
      },
      {
        property: "Status",
        select: { equals: "archived" },
      },
    ],
  })
  assert.deepEqual((queries[1] as { filter: unknown }).filter, first.filter)
})
