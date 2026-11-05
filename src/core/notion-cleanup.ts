import { collectPaginatedAPI, isFullPage } from "@notionhq/client"
import { STATUS_PROPERTY } from "../review/cards.ts"
import type { NotionSyncClient } from "./notion-sync.ts"

/** An archived page created at least this long ago is deleted. */
export const STALE_PAGE_AGE_MS = 30 * 24 * 60 * 60 * 1000

const ARCHIVED_STATUS = "archived"

export type CleanupSummary = {
  deleted: number
  failed: number
}

export function staleCutoff(now: Date): Date {
  return new Date(now.getTime() - STALE_PAGE_AGE_MS)
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function hasArchivedStatus(property: unknown): boolean {
  if (typeof property !== "object" || property === null) return false
  const record = property as {
    type?: string
    select?: { name?: string } | null
    status?: { name?: string } | null
  }
  if (record.type === "select") return record.select?.name === ARCHIVED_STATUS
  if (record.type === "status") return record.status?.name === ARCHIVED_STATUS
  return false
}

/**
 * Trash Notion pages with Status `archived` whose `created_time` is more than 30 days before `now`.
 * `archived: true` moves the page to trash.
 */
export async function deleteStalePages(
  client: NotionSyncClient,
  databaseId: string,
  now: Date,
  onError: (message: string) => void,
): Promise<CleanupSummary> {
  const cutoff = staleCutoff(now)
  const pages = await collectPaginatedAPI(client.databases.query, {
    database_id: databaseId,
    filter: {
      and: [
        {
          timestamp: "created_time",
          created_time: { before: cutoff.toISOString() },
        },
        {
          property: STATUS_PROPERTY,
          select: { equals: ARCHIVED_STATUS },
        },
      ],
    },
  })

  const summary: CleanupSummary = { deleted: 0, failed: 0 }
  for (const page of pages) {
    if (!isFullPage(page) || page.archived || page.in_trash) {
      continue
    }
    const created = Date.parse(page.created_time)
    if (!Number.isFinite(created) || created >= cutoff.getTime()) {
      continue
    }
    if (!hasArchivedStatus(page.properties[STATUS_PROPERTY])) {
      continue
    }

    try {
      await client.pages.update({
        page_id: page.id,
        archived: true,
      })
      summary.deleted += 1
    } catch (err) {
      summary.failed += 1
      onError(`${page.id}: ${errorMessage(err)}`)
    }
  }

  return summary
}
