import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
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

function splitTitle(rawTitle: string): { title: string; company: string } {
  const separator = " at "
  const separatorIndex = rawTitle.lastIndexOf(separator)
  if (separatorIndex === -1) {
    return { title: rawTitle.trim(), company: "" }
  }

  return {
    title: rawTitle.slice(0, separatorIndex).trim(),
    company: rawTitle.slice(separatorIndex + separator.length).trim(),
  }
}

function resolveRemote(location: string): RemotePolicy {
  const value = location.toLowerCase()
  if (!value.trim()) {
    return "unknown"
  }

  const hasRemote = /\bremote\b|télétravail|teletravail/.test(value)
  const hasHybrid =
    value.includes("hybrid") ||
    (hasRemote &&
      (value.includes("part-time") ||
        value.includes("partiel") ||
        value.includes("onsite")))

  if (hasHybrid) {
    return "hybrid"
  }
  if (hasRemote) {
    return "remote"
  }
  return "onsite"
}

function resolveCompany(company: string, url: string): string {
  if (company) {
    return company
  }
  return `unknown (${hashDigits(url)})`
}

function labelValue(html: string, label: string): string {
  const match = html.match(
    new RegExp(`${label}:\\s*</strong>\\s*([^<]+)`, "i"),
  )
  return stripHtml(match?.[1] ?? "")
}

function resolveDescription(raw: string): string {
  return stripHtml(raw).replace(/\s*Read the full job description\s*$/i, "").trim()
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
  if (!url) {
    return undefined
  }

  const { title, company } = splitTitle(stripHtml(item.title))
  if (!title) {
    return undefined
  }

  const rawDescription = item.description ?? item.content ?? ""
  const location = labelValue(rawDescription, "Location")

  return {
    dedupKey: makeDedupKey(title, resolveCompany(company, url)),
    title,
    company: resolveCompany(company, url),
    url,
    location,
    remote: resolveRemote(location),
    salary: labelValue(rawDescription, "Salary"),
    description: resolveDescription(rawDescription),
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
