import {
  APIErrorCode,
  APIResponseError,
} from "@notionhq/client"
import assert from "node:assert/strict"
import { test } from "node:test"
import { offer } from "../test/job-offer-fixture.ts"
import {
  buildPageProperties,
  loadDedupKeyMap,
  readDedupKeyFromPage,
  syncOffersToNotion,
  withNotionRetry,
  type NotionSyncClient,
} from "./notion-sync.ts"

function rateLimitedError(): APIResponseError {
  return new APIResponseError({
    code: APIErrorCode.RateLimited,
    message: "Rate limited",
    status: 429,
    headers: {},
    rawBodyText: "",
  })
}

test("withNotionRetry retries rate-limited Notion calls", async () => {
  let attempts = 0
  const result = await withNotionRetry(async () => {
    attempts += 1
    if (attempts === 1) {
      throw rateLimitedError()
    }
    return "ok"
  })

  assert.equal(result, "ok")
  assert.equal(attempts, 2)
})

test("withNotionRetry does not retry validation errors", async () => {
  let attempts = 0
  await assert.rejects(
    () =>
      withNotionRetry(async () => {
        attempts += 1
        throw new APIResponseError({
          code: APIErrorCode.ValidationError,
          message: "Invalid body",
          status: 400,
          headers: {},
          rawBodyText: "",
        })
      }),
    (err: APIResponseError) => err.code === APIErrorCode.ValidationError,
  )
  assert.equal(attempts, 1)
})

test("buildPageProperties maps JobOffer fields to Notion properties", () => {
  const job = offer({
    title: "Engineer",
    company: "Acme",
    url: "https://example.com/job",
    location: "Paris",
    remote: "remote",
    salary: "60k EUR",
    description: "Build things",
    publishedAt: "2026-01-01T00:00:00.000Z",
    source: "adzuna-remote",
    dedupKey: "engineer | acme",
  })

  const properties = buildPageProperties(job)

  assert.deepEqual(properties.Title, {
    title: [{ type: "text", text: { content: "Engineer" } }],
  })
  assert.deepEqual(properties.Company, {
    rich_text: [{ type: "text", text: { content: "Acme" } }],
  })
  assert.deepEqual(properties.URL, { url: "https://example.com/job" })
  assert.deepEqual(properties.Location, {
    rich_text: [{ type: "text", text: { content: "Paris" } }],
  })
  assert.deepEqual(properties.Remote, { select: { name: "remote" } })
  assert.deepEqual(properties.Salary, {
    rich_text: [{ type: "text", text: { content: "60k EUR" } }],
  })
  assert.deepEqual(properties.Description, {
    rich_text: [{ type: "text", text: { content: "Build things" } }],
  })
  assert.deepEqual(properties.PublishedAt, {
    rich_text: [{ type: "text", text: { content: "2026-01-01T00:00:00.000Z" } }],
  })
  assert.deepEqual(properties.Source, {
    rich_text: [{ type: "text", text: { content: "adzuna-remote" } }],
  })
  assert.deepEqual(properties.DedupKey, {
    rich_text: [{ type: "text", text: { content: "engineer | acme" } }],
  })
})

test("readDedupKeyFromPage returns the DedupKey rich text value", () => {
  const key = readDedupKeyFromPage({
    properties: {
      DedupKey: {
        type: "rich_text",
        rich_text: [{ plain_text: "engineer | acme" }],
      },
    },
  })

  assert.equal(key, "engineer | acme")
})

test("loadDedupKeyMap paginates database query results", async () => {
  const calls: string[] = []
  const client = {
    databases: {
      query: async ({ start_cursor }) => {
        calls.push(start_cursor ?? "start")
        if (!start_cursor) {
          return {
            object: "list",
            results: [
              {
                object: "page",
                id: "page-1",
                url: "https://notion.so/page-1",
                properties: {
                  DedupKey: {
                    type: "rich_text",
                    rich_text: [{ plain_text: "first | acme" }],
                  },
                },
              },
            ],
            has_more: true,
            next_cursor: "cursor-2",
          }
        }
        return {
          object: "list",
          results: [
            {
              object: "page",
              id: "page-2",
              url: "https://notion.so/page-2",
              properties: {
                DedupKey: {
                  type: "rich_text",
                  rich_text: [{ plain_text: "second | beta" }],
                },
              },
            },
          ],
          has_more: false,
          next_cursor: null,
        }
      },
    },
    pages: {
      create: async () => ({ id: "new" }),
      update: async ({ page_id }) => ({ id: page_id }),
    },
  } as unknown as NotionSyncClient

  const map = await loadDedupKeyMap(client, "db-1")

  assert.deepEqual([...map.entries()], [
    ["first | acme", "page-1"],
    ["second | beta", "page-2"],
  ])
  assert.deepEqual(calls, ["start", "cursor-2"])
})

test("syncOffersToNotion creates new pages and updates existing ones sequentially", async () => {
  const existing = offer({
    title: "Existing",
    company: "Acme",
    dedupKey: "existing | acme",
  })
  const fresh = offer({
    title: "Fresh",
    company: "Beta",
    dedupKey: "fresh | beta",
  })

  const created: unknown[] = []
  const updated: unknown[] = []
  const order: string[] = []

  const client = {
    databases: {
      query: async () => ({
        object: "list",
        results: [
          {
            object: "page",
            id: "page-existing",
            url: "https://notion.so/page-existing",
            properties: {
              DedupKey: {
                type: "rich_text",
                rich_text: [{ plain_text: existing.dedupKey }],
              },
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    },
    pages: {
      create: async (args) => {
        order.push("create")
        created.push(args)
        return { id: "page-new" }
      },
      update: async (args) => {
        order.push("update")
        updated.push(args)
        return { id: args.page_id }
      },
    },
  } as unknown as NotionSyncClient

  const summary = await syncOffersToNotion(client, "db-1", [existing, fresh])

  assert.deepEqual(summary, { created: 1, updated: 1 })
  assert.equal(updated.length, 1)
  assert.equal(created.length, 1)
  assert.equal((updated[0] as { page_id: string }).page_id, "page-existing")
  assert.equal(order[0], "update")
  assert.equal(order[1], "create")
})
