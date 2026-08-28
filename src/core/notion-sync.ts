import {
  APIErrorCode,
  APIResponseError,
  Client,
  collectPaginatedAPI,
  isFullPage,
} from "@notionhq/client"
import type { JobOffer } from "../types/job-offer.ts"
import {
  FETCH_BACKOFF_BASE_MS,
  FETCH_MAX_RETRIES,
} from "../types/fetch.ts"

export const NOTION_PROPERTIES = {
  title: "Title",
  company: "Company",
  url: "URL",
  location: "Location",
  remote: "Remote",
  salary: "Salary",
  description: "Description",
  publishedAt: "PublishedAt",
  source: "Source",
  dedupKey: "DedupKey",
} as const

type RichTextRequest = {
  type: "text"
  text: { content: string }
}

export type NotionSyncClient = Pick<Client, "databases" | "pages">

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableNotionError(err: unknown): boolean {
  if (!APIResponseError.isAPIResponseError(err)) {
    return false
  }
  return (
    err.status === 429 ||
    err.code === APIErrorCode.RateLimited ||
    err.code === APIErrorCode.InternalServerError ||
    err.code === APIErrorCode.ServiceUnavailable
  )
}

/** Retry Notion API calls on rate limits and transient server errors. */
export async function withNotionRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(FETCH_BACKOFF_BASE_MS * 2 ** (attempt - 1))
    }
    try {
      return await operation()
    } catch (err) {
      if (!isRetryableNotionError(err) || attempt >= FETCH_MAX_RETRIES) {
        throw err
      }
      lastError = err
    }
  }
  throw lastError
}

export function wrapNotionClientWithRetry(client: Client): NotionSyncClient {
  return {
    databases: {
      query: (args) => withNotionRetry(() => client.databases.query(args)),
    },
    pages: {
      create: (args) => withNotionRetry(() => client.pages.create(args)),
      update: (args) => withNotionRetry(() => client.pages.update(args)),
    },
  }
}

function richText(content: string): RichTextRequest[] {
  return [{ type: "text", text: { content } }]
}

function readRichText(
  property:
    | { type: "rich_text"; rich_text: Array<{ plain_text?: string }> }
    | undefined,
): string {
  if (!property || property.type !== "rich_text") {
    return ""
  }
  return property.rich_text.map((item) => item.plain_text ?? "").join("")
}

type PageWithProperties = {
  properties: Record<
    string,
    | { type: "rich_text"; rich_text: Array<{ plain_text?: string }> }
    | { type: string }
  >
}

export function readDedupKeyFromPage(page: PageWithProperties): string | null {
  const property = page.properties[NOTION_PROPERTIES.dedupKey]
  if (property?.type !== "rich_text") {
    return null
  }
  const value = readRichText(property)
  return value.length > 0 ? value : null
}

export function buildPageProperties(offer: JobOffer): Record<string, unknown> {
  return {
    [NOTION_PROPERTIES.title]: {
      title: richText(offer.title),
    },
    [NOTION_PROPERTIES.company]: {
      rich_text: richText(offer.company),
    },
    [NOTION_PROPERTIES.url]: {
      url: offer.url,
    },
    [NOTION_PROPERTIES.location]: {
      rich_text: richText(offer.location),
    },
    [NOTION_PROPERTIES.remote]: {
      select: { name: offer.remote },
    },
    [NOTION_PROPERTIES.salary]: {
      rich_text: richText(offer.salary),
    },
    [NOTION_PROPERTIES.description]: {
      rich_text: richText(offer.description),
    },
    [NOTION_PROPERTIES.publishedAt]: {
      rich_text: richText(offer.publishedAt),
    },
    [NOTION_PROPERTIES.source]: {
      rich_text: richText(offer.source),
    },
    [NOTION_PROPERTIES.dedupKey]: {
      rich_text: richText(offer.dedupKey),
    },
  }
}

export async function loadDedupKeyMap(
  client: NotionSyncClient,
  databaseId: string,
): Promise<Map<string, string>> {
  const pages = await collectPaginatedAPI(
    client.databases.query,
    { database_id: databaseId },
  )

  const map = new Map<string, string>()
  for (const page of pages) {
    if (!isFullPage(page)) {
      continue
    }
    const dedupKey = readDedupKeyFromPage(page)
    if (dedupKey) {
      map.set(dedupKey, page.id)
    }
  }
  return map
}

export async function syncOffersToNotion(
  client: NotionSyncClient,
  databaseId: string,
  offers: JobOffer[],
): Promise<{ created: number; updated: number }> {
  const dedupKeyToPageId = await loadDedupKeyMap(client, databaseId)
  let created = 0
  let updated = 0

  for (const offer of offers) {
    const properties = buildPageProperties(offer)
    const existingPageId = dedupKeyToPageId.get(offer.dedupKey)

    if (existingPageId) {
      await client.pages.update({
        page_id: existingPageId,
        properties: properties as Parameters<Client["pages"]["update"]>[0]["properties"],
      })
      updated += 1
    } else {
      const page = await client.pages.create({
        parent: { database_id: databaseId },
        properties: properties as Parameters<Client["pages"]["create"]>[0]["properties"],
      })
      dedupKeyToPageId.set(offer.dedupKey, page.id)
      created += 1
    }
  }

  return { created, updated }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function createNotionClient(): NotionSyncClient {
  const client = new Client({ auth: requireEnv("NOTION_TOKEN") })
  return wrapNotionClientWithRetry(client)
}
