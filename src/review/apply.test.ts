import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { NotionSyncClient } from "../core/notion-sync.ts"
import { offer } from "../test/job-offer-fixture.ts"
import { reviewCreatedPages, reviewNewCards } from "./apply.ts"
import type { ReviewChatInput } from "./cursor.ts"
import type { ReviewRules } from "./rules.ts"

const rules: ReviewRules = {
  model: "grok-4.7",
  reasoning_effort: "medium",
  rules: [
    {
      id: "internship",
      reason: "Internship, apprenticeship, or stage.",
      comment: "Archived — internship.",
    },
  ],
}

function page(title: string) {
  return {
    pageId: `page-${title}`,
    offer: offer({ title, company: "Acme" }),
  }
}

function notionClient(): {
  client: NotionSyncClient
  comments: unknown[]
  updates: unknown[]
  order: string[]
} {
  const comments: unknown[] = []
  const updates: unknown[] = []
  const order: string[] = []
  const client = {
    comments: {
      create: async (args: unknown) => {
        order.push("comment")
        comments.push(args)
        return { id: "comment-1" }
      },
    },
    pages: {
      update: async (args: unknown) => {
        order.push("update")
        updates.push(args)
        return { id: "page" }
      },
    },
  } as unknown as NotionSyncClient
  return { client, comments, updates, order }
}

test("reviewCreatedPages comments with the rule text, then archives", async () => {
  const notion = notionClient()
  const seen: ReviewChatInput[] = []
  const summary = await reviewCreatedPages(
    notion.client,
    [page("Intern")],
    rules,
    async (input) => {
      seen.push(input)
      return { ruleId: "internship" }
    },
    () => {
      throw new Error("unexpected error")
    },
  )

  assert.deepEqual(summary, { archived: 1, kept: 0, failed: 0 })
  assert.equal(seen[0]?.model, "grok-4.7")
  assert.equal(seen[0]?.reasoningEffort, "medium")
  assert.match(seen[0]?.user ?? "", /Title: Intern/)
  assert.deepEqual(notion.order, ["comment", "update"])
  assert.deepEqual(notion.comments[0], {
    parent: { page_id: "page-Intern" },
    rich_text: [{ type: "text", text: { content: "Archived — internship." } }],
  })
  assert.deepEqual(
    (notion.updates[0] as { properties: unknown }).properties,
    { Status: { select: { name: "archived" } } },
  )
})

test("reviewCreatedPages leaves Status empty when no rule matches", async () => {
  const notion = notionClient()
  const summary = await reviewCreatedPages(
    notion.client,
    [page("Engineer")],
    rules,
    async () => ({ ruleId: null }),
    () => {
      throw new Error("unexpected error")
    },
  )

  assert.deepEqual(summary, { archived: 0, kept: 1, failed: 0 })
  assert.equal(notion.order.length, 0)
})

test("reviewCreatedPages does not archive an unknown rule id", async () => {
  const notion = notionClient()
  const errors: string[] = []
  const summary = await reviewCreatedPages(
    notion.client,
    [page("Engineer")],
    rules,
    async () => ({ ruleId: "nope" }),
    (message) => errors.push(message),
  )

  assert.deepEqual(summary, { archived: 0, kept: 0, failed: 1 })
  assert.equal(notion.order.length, 0)
  assert.match(errors[0] ?? "", /unknown rule id nope/)
})

test("reviewCreatedPages does not archive when the comment fails", async () => {
  const updates: unknown[] = []
  const client = {
    comments: {
      create: async () => {
        throw new Error("comment denied")
      },
    },
    pages: {
      update: async (args: unknown) => {
        updates.push(args)
        return { id: "page" }
      },
    },
  } as unknown as NotionSyncClient
  const errors: string[] = []

  const summary = await reviewCreatedPages(
    client,
    [page("Intern")],
    rules,
    async () => ({ ruleId: "internship" }),
    (message) => errors.push(message),
  )

  assert.deepEqual(summary, { archived: 0, kept: 0, failed: 1 })
  assert.equal(updates.length, 0)
  assert.match(errors[0] ?? "", /comment denied/)
})

test("reviewNewCards skips when the key or the rules list is empty", async () => {
  const logs: string[] = []
  const notion = notionClient()
  const createdPages = [page("Engineer")]
  let calls = 0

  await reviewNewCards({
    client: notion.client,
    createdPages,
    rulesPath: "unused",
    apiKey: "  ",
    complete: async () => {
      calls += 1
      return { ruleId: null }
    },
    onError: () => {
      throw new Error("unexpected error")
    },
    log: (message) => logs.push(message),
  })

  const dir = mkdtempSync(join(tmpdir(), "review-rules-"))
  const rulesPath = join(dir, "review-rules.yaml")
  writeFileSync(
    rulesPath,
    "model: grok-4.7\nreasoning_effort: medium\nrules: []\n",
    "utf8",
  )

  await reviewNewCards({
    client: notion.client,
    createdPages,
    rulesPath,
    apiKey: "key",
    complete: async () => {
      calls += 1
      return { ruleId: null }
    },
    onError: () => {
      throw new Error("unexpected error")
    },
    log: (message) => logs.push(message),
  })

  assert.deepEqual(logs, [
    "Review: skipped (CURSOR_API_KEY unset)",
    "Review: skipped (no rules)",
  ])
  assert.equal(calls, 0)
})
