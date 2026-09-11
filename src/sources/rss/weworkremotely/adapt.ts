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

function splitTitle(rawTitle: string): { company: string; title: string } {
  const separatorIndex = rawTitle.indexOf(": ")
  if (separatorIndex === -1) {
    return { company: "", title: rawTitle.trim() }
  }

  return {
    company: rawTitle.slice(0, separatorIndex).trim(),
    title: rawTitle.slice(separatorIndex + 2).trim(),
  }
}

function resolveCompany(company: string, url: string): string {
  if (company) {
    return company
  }
  return `unknown (${hashDigits(url)})`
}

function resolveDescription(item: FeedItem): string {
  const raw = item.content ?? item.description ?? ""
  return stripHtml(raw)
}

function resolveLocation(item: FeedItem): string {
  const region = item.extras?.region?.trim()
  if (region) {
    return region
  }
  return "Remote"
}

function normalizePublishedAt(value: string | undefined, url: string): string {
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
  if (!url) {
    return undefined
  }

  const { company, title } = splitTitle(item.title)
  if (!title) {
    return undefined
  }

  return {
    dedupKey: makeDedupKey(title, resolveCompany(company, url)),
    title,
    company: resolveCompany(company, url),
    url,
    location: resolveLocation(item),
    remote: "remote",
    salary: "",
    description: resolveDescription(item),
    publishedAt: normalizePublishedAt(item.publishedAt, url),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = feedPayloadSchema.parse(rawPayload)
  return parsed.items
    .map(adaptItem)
    .filter((offer): offer is JobOffer => offer !== undefined)
}
