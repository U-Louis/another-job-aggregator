import type { Client } from "@notionhq/client"
import type { CreatedNotionPage, NotionSyncClient } from "../core/notion-sync.ts"
import { buildStatusUpdate } from "./cards.ts"
import {
  buildReviewPrompt,
  formatJobCard,
  loadReviewRules,
  parseVerdict,
  verdictJsonSchema,
  type ReviewRules,
} from "./rules.ts"
import type { ReviewChatInput } from "./cursor.ts"

export type ReviewSummary = {
  archived: number
  kept: number
  failed: number
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function reviewCreatedPages(
  client: NotionSyncClient,
  pages: CreatedNotionPage[],
  rules: ReviewRules,
  complete: (input: ReviewChatInput) => Promise<unknown>,
  onError: (message: string) => void,
): Promise<ReviewSummary> {
  const summary: ReviewSummary = { archived: 0, kept: 0, failed: 0 }
  if (rules.rules.length === 0 || pages.length === 0) {
    return summary
  }

  const system = buildReviewPrompt(rules.rules)
  const schema = verdictJsonSchema(rules.rules.map((rule) => rule.id))
  const byId = new Map(rules.rules.map((rule) => [rule.id, rule]))

  for (const page of pages) {
    const label = `${page.offer.title} @ ${page.offer.company}`
    try {
      const raw = await complete({
        model: rules.model,
        reasoningEffort: rules.reasoning_effort,
        system,
        user: formatJobCard(page.offer),
        schema,
      })
      const ruleId = parseVerdict(raw)
      if (ruleId === null) {
        summary.kept += 1
        continue
      }
      const rule = byId.get(ruleId)
      if (!rule) {
        summary.failed += 1
        onError(`${label}: unknown rule id ${ruleId}`)
        continue
      }

      await client.comments.create({
        parent: { page_id: page.pageId },
        rich_text: [{ type: "text", text: { content: rule.comment } }],
      })
      await client.pages.update({
        page_id: page.pageId,
        properties: buildStatusUpdate("archived") as Parameters<
          Client["pages"]["update"]
        >[0]["properties"],
      })
      summary.archived += 1
    } catch (err) {
      summary.failed += 1
      onError(`${label}: ${errorMessage(err)}`)
    }
  }

  return summary
}

export async function reviewNewCards(options: {
  client: NotionSyncClient
  createdPages: CreatedNotionPage[]
  rulesPath: string
  apiKey: string | undefined
  complete: (input: ReviewChatInput) => Promise<unknown>
  onError: (message: string) => void
  log: (message: string) => void
}): Promise<void> {
  if (options.createdPages.length === 0) {
    return
  }

  const apiKey = options.apiKey?.trim() ?? ""
  if (!apiKey) {
    options.log("Review: skipped (CURSOR_API_KEY unset)")
    return
  }

  let rules: ReviewRules
  try {
    rules = loadReviewRules(options.rulesPath)
  } catch (err) {
    options.onError(errorMessage(err))
    return
  }

  if (rules.rules.length === 0) {
    options.log("Review: skipped (no rules)")
    return
  }

  const summary = await reviewCreatedPages(
    options.client,
    options.createdPages,
    rules,
    options.complete,
    options.onError,
  )
  options.log(
    `Review: ${summary.archived} archived, ${summary.kept} kept, ${summary.failed} failed`,
  )
}
