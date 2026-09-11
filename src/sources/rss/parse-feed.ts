import { XMLParser } from "fast-xml-parser"
import { feedPayloadSchema, type FeedItem, type FeedPayload } from "./schema.ts"

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  isArray: (tagName) => tagName === "item" || tagName === "entry" || tagName === "category",
})

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value && typeof value === "object" && "#text" in value) {
    return asString((value as { "#text": unknown })["#text"])
  }
  return undefined
}

function asStringArray(value: unknown): string[] {
  if (value === undefined) {
    return []
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const text = asString(entry)
      if (text) {
        return [text]
      }
      if (entry && typeof entry === "object" && "@_term" in entry) {
        const term = asString((entry as { "@_term": unknown })["@_term"])
        return term ? [term] : []
      }
      return []
    })
  }
  const text = asString(value)
  return text ? [text] : []
}

function collectExtras(
  record: Record<string, unknown>,
  knownKeys: Set<string>,
): Record<string, string> | undefined {
  const extras: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (knownKeys.has(key) || key.startsWith("@_")) {
      continue
    }
    const text = asString(value)
    if (text) {
      extras[key] = text
    }
  }
  return Object.keys(extras).length > 0 ? extras : undefined
}

function resolveAtomLink(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const href = resolveAtomLink(entry)
      if (href) {
        return href
      }
    }
    return undefined
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const href = asString(record["@_href"])
    if (href) {
      return href
    }
  }
  return undefined
}

function resolveAtomAuthor(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const name = resolveAtomAuthor(entry)
      if (name) {
        return name
      }
    }
    return undefined
  }
  if (value && typeof value === "object") {
    return asString((value as { name?: unknown }).name)
  }
  return undefined
}

function parseRssItem(raw: Record<string, unknown>): FeedItem | undefined {
  const title = asString(raw.title)
  const link = asString(raw.link) ?? asString(raw.guid)
  if (!title || !link) {
    return undefined
  }

  const knownKeys = new Set([
    "title",
    "link",
    "guid",
    "description",
    "content:encoded",
    "pubDate",
    "dc:creator",
    "author",
    "category",
  ])

  return {
    title,
    link,
    id: asString(raw.guid) ?? link,
    description: asString(raw.description),
    content: asString(raw["content:encoded"]),
    publishedAt: asString(raw.pubDate),
    author: asString(raw["dc:creator"]) ?? asString(raw.author),
    categories: asStringArray(raw.category),
    extras: collectExtras(raw, knownKeys),
  }
}

function parseAtomEntry(raw: Record<string, unknown>): FeedItem | undefined {
  const title = asString(raw.title)
  const link = resolveAtomLink(raw.link) ?? asString(raw.id)
  if (!title || !link) {
    return undefined
  }

  const knownKeys = new Set([
    "title",
    "link",
    "id",
    "summary",
    "content",
    "updated",
    "published",
    "author",
    "category",
  ])

  return {
    title,
    link,
    id: asString(raw.id) ?? link,
    description: asString(raw.summary),
    content: asString(raw.content),
    publishedAt: asString(raw.published) ?? asString(raw.updated),
    author: resolveAtomAuthor(raw.author),
    categories: asStringArray(raw.category),
    extras: collectExtras(raw, knownKeys),
  }
}

function parseJsonFeedItem(raw: unknown): FeedItem | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined
  }

  const record = raw as Record<string, unknown>
  const title = asString(record.title)
  const link =
    asString(record.url) ?? asString(record.external_url) ?? asString(record.id)
  if (!title || !link) {
    return undefined
  }

  const authorFromArray = Array.isArray(record.authors)
    ? record.authors
        .map((entry) =>
          entry && typeof entry === "object"
            ? asString((entry as { name?: unknown }).name)
            : undefined,
        )
        .find((name): name is string => Boolean(name))
    : undefined

  return {
    title,
    link,
    id: asString(record.id) ?? link,
    description: asString(record.summary) ?? asString(record.content_text),
    content: asString(record.content_html),
    publishedAt: asString(record.date_published) ?? asString(record.date_modified),
    author: authorFromArray ?? asString(record.author),
    categories: asStringArray(record.tags),
  }
}

function parseRssFeed(body: string): FeedPayload {
  const parsed = xmlParser.parse(body) as Record<string, unknown>
  const channel = parsed.rss as Record<string, unknown> | undefined
  const channelBody = channel?.channel as Record<string, unknown> | undefined
  const rawItems = channelBody?.item
  const items: FeedItem[] = []

  if (Array.isArray(rawItems)) {
    for (const raw of rawItems) {
      if (raw && typeof raw === "object") {
        const item = parseRssItem(raw as Record<string, unknown>)
        if (item) {
          items.push(item)
        }
      }
    }
  } else if (rawItems && typeof rawItems === "object") {
    const item = parseRssItem(rawItems as Record<string, unknown>)
    if (item) {
      items.push(item)
    }
  }

  return { format: "rss", items }
}

function parseAtomFeed(body: string): FeedPayload {
  const parsed = xmlParser.parse(body) as Record<string, unknown>
  const feed = parsed.feed as Record<string, unknown> | undefined
  const rawEntries = feed?.entry
  const items: FeedItem[] = []

  if (Array.isArray(rawEntries)) {
    for (const raw of rawEntries) {
      if (raw && typeof raw === "object") {
        const item = parseAtomEntry(raw as Record<string, unknown>)
        if (item) {
          items.push(item)
        }
      }
    }
  } else if (rawEntries && typeof rawEntries === "object") {
    const item = parseAtomEntry(rawEntries as Record<string, unknown>)
    if (item) {
      items.push(item)
    }
  }

  return { format: "atom", items }
}

function parseJsonFeed(body: string): FeedPayload {
  const parsed = JSON.parse(body) as unknown
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON feed payload must be an object")
  }

  const record = parsed as Record<string, unknown>
  const rawItems = record.items
  if (!Array.isArray(rawItems)) {
    throw new Error("JSON feed payload must include an items array")
  }

  const items = rawItems
    .map(parseJsonFeedItem)
    .filter((item): item is FeedItem => item !== undefined)

  return { format: "json", items }
}

function detectFeedFormat(body: string): "rss" | "atom" | "json" {
  const trimmed = body.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json"
  }
  if (/<feed[\s>]/i.test(trimmed)) {
    return "atom"
  }
  if (/<rss[\s>]/i.test(trimmed)) {
    return "rss"
  }
  throw new Error("Unsupported feed format")
}

export function parseFeed(body: string): FeedPayload {
  const format = detectFeedFormat(body)
  const payload =
    format === "json"
      ? parseJsonFeed(body)
      : format === "atom"
        ? parseAtomFeed(body)
        : parseRssFeed(body)

  return feedPayloadSchema.parse(payload)
}
