import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer } from "../../../types/job-offer.ts"
import { feedPayloadSchema, type FeedItem } from "../schema.ts"

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&([a-z]+);/gi, (entity, name: string) =>
      NAMED_ENTITIES[name.toLowerCase()] ?? entity,
    )
    .replace(/\s+/g, " ")
    .trim()
}

function hashDigits(url: string): string {
  const hex = createHash("sha256").update(url).digest("hex")
  const decimal = BigInt(`0x${hex}`).toString(10)
  return decimal.slice(0, 5).padStart(5, "0")
}

function parseAuthorParts(author: string | undefined): {
  company: string
  location: string
} {
  if (!author) {
    return { company: "", location: "" }
  }

  const parts = author.split(/<br\s*\/?>/i)
  const company = stripHtml(parts[0] ?? "").trim()
  const location = stripHtml(parts[1] ?? "")
    .replace(/^⚲\s*/, "")
    .trim()

  return { company, location }
}

function resolveCompany(item: FeedItem, url: string): string {
  const fromExtras = item.extras?.["job_listing:company"]?.trim()
  if (fromExtras) {
    return fromExtras
  }

  const fromAuthor = parseAuthorParts(item.author).company
  if (fromAuthor) {
    return fromAuthor
  }

  return `unknown (${hashDigits(url)})`
}

function resolveLocation(item: FeedItem): string {
  const fromExtras = item.extras?.["job_listing:location"]?.trim()
  if (fromExtras) {
    return fromExtras
  }

  const fromAuthor = parseAuthorParts(item.author).location
  if (fromAuthor) {
    return fromAuthor
  }

  return "Remote"
}

function resolveDescription(item: FeedItem): string {
  const raw = item.content ?? item.description ?? ""
  return stripHtml(raw)
}

function normalizePublishedAt(value: string | undefined): string {
  if (value) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }
  return new Date(0).toISOString()
}

function adaptItem(item: FeedItem): JobOffer | undefined {
  const url = item.link.trim()
  const title = item.title.trim()
  if (!url || !title) {
    return undefined
  }

  const company = resolveCompany(item, url)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location: resolveLocation(item),
    remote: "remote",
    salary: "",
    description: resolveDescription(item),
    publishedAt: normalizePublishedAt(item.publishedAt),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = feedPayloadSchema.parse(rawPayload)
  return parsed.items
    .map(adaptItem)
    .filter((offer): offer is JobOffer => offer !== undefined)
}
