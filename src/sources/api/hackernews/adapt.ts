import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import { hnPayloadSchema, type HnComment } from "./schema.ts"

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

const JOB_TITLE_PATTERN =
  /\b(engineer|developer|designer|manager|architect|scientist|analyst|lead|director|programmer|devops|sre|staff|principal|intern|researcher|product manager)\b/i

const META_FIELD_PATTERN =
  /^(remote|onsite|on-site|hybrid|full[- ]?time|part[- ]?time|contract|visa|interns?)$/i

const SALARY_PATTERN =
  /\$[\d,]+K?(?:\s*[–-]\s*\$[\d,]+K?)?(?:\s*\+?\s*(?:equity|TC))?|\b\d{2,3}k(?:\s*[–-]\s*\d{2,3}k)?\b/i

export function stripHtml(value: string): string {
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

function commentUrl(commentId: number): string {
  return `https://news.ycombinator.com/item?id=${commentId}`
}

function firstLine(text: string): string {
  const withoutParagraphs = text.split(/<p>|\n/)[0] ?? text
  return stripHtml(withoutParagraphs).replace(/^\*+|\*+$/g, "").trim()
}

function splitFields(firstLineText: string): string[] {
  return firstLineText
    .split("|")
    .map((field) => field.trim())
    .filter((field) => field.length > 0)
}

function isUrlField(field: string): boolean {
  return /^https?:\/\//i.test(field) || /^www\./i.test(field)
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export function extractUrl(text: string, commentId: number): string {
  const hrefMatch = text.match(/href="(https?:[^"]+)"/i)
  if (hrefMatch?.[1]) {
    return normalizeUrl(stripHtml(hrefMatch[1]))
  }

  const plain = stripHtml(text)
  const urlMatch = plain.match(/https?:\/\/[^\s|,]+/i)
  if (urlMatch?.[0]) {
    return normalizeUrl(urlMatch[0])
  }

  const wwwMatch = plain.match(/\bwww\.[^\s|,]+/i)
  if (wwwMatch?.[0]) {
    return normalizeUrl(wwwMatch[0])
  }

  return commentUrl(commentId)
}

function isMetaField(field: string): boolean {
  return META_FIELD_PATTERN.test(field) || SALARY_PATTERN.test(field)
}

function looksLikeTitle(field: string): boolean {
  return JOB_TITLE_PATTERN.test(field)
}

function looksLikeLocation(field: string): boolean {
  if (/\bremote\b/i.test(field)) {
    return true
  }
  return /,\s*[A-Z]{2}\b|[A-Z]{2,}\)|\b(Germany|France|Spain|Canada|Netherlands|Switzerland|Europe|UK|London|Berlin|Paris|Amsterdam|San Francisco|New York)\b/i.test(
    field,
  )
}

function extractTitleFromBody(text: string): string | undefined {
  const body = text.split(/<p>|\n/).slice(1).join("\n")
  const plain = stripHtml(body)
  const bulletMatch = plain.match(
    /(?:^|\n)\*\s+((?:Senior\s+)?[^(\n|]{3,80}?)(?:\s*\(|$|\|)/i,
  )
  if (bulletMatch?.[1]) {
    return bulletMatch[1].trim()
  }

  const roleMatch = plain.match(
    /\b((?:Senior|Staff|Principal|Lead)\s+)?(?:Software|Backend|Frontend|Full Stack|Infrastructure|Platform|DevOps|ML|Machine Learning|Product|Security)[^.\n|]{0,60}?(?:Engineer|Developer|Architect|Manager|Scientist|SRE|Designer)\b/i,
  )
  return roleMatch?.[0]?.trim()
}

function resolveTitle(fields: string[], text: string): string {
  const titleField = fields.find((field) => looksLikeTitle(field))
  if (titleField) {
    return titleField
  }

  const fromBody = extractTitleFromBody(text)
  if (fromBody) {
    return fromBody
  }

  const nonMeta = fields.filter((field) => !isMetaField(field) && !isUrlField(field))
  if (nonMeta.length >= 2 && !looksLikeLocation(nonMeta[1] ?? "")) {
    return nonMeta[1] ?? "Open roles"
  }

  const fallback = nonMeta.find((field) => !looksLikeLocation(field))
  return fallback ?? "Open roles"
}

function resolveCompany(fields: string[], url: string): string {
  const nonMeta = fields.filter(
    (field) => !isMetaField(field) && !isUrlField(field) && !looksLikeTitle(field),
  )

  const titleField = fields.find((field) => looksLikeTitle(field))
  if (titleField) {
    const titleIndex = fields.indexOf(titleField)
    const beforeTitle = fields
      .slice(0, titleIndex)
      .find((field) => !isMetaField(field) && !isUrlField(field))
    if (beforeTitle) {
      return beforeTitle
    }
  }

  const company = nonMeta[0]?.trim()
  if (company) {
    return company
  }

  return `unknown (${hashDigits(url)})`
}

function resolveLocation(fields: string[], description: string): string {
  const locationField = fields.find((field) => looksLikeLocation(field))
  if (locationField) {
    return locationField
  }

  const remoteField = fields.find((field) => /\bremote\b/i.test(field))
  if (remoteField) {
    return remoteField
  }

  if (/\bremote\b/i.test(description)) {
    return "Remote"
  }

  return "Unknown"
}

export function resolveRemote(fields: string[], description: string): RemotePolicy {
  const combined = `${fields.join(" ")} ${description}`.toLowerCase()

  const hasRemote = /\bremote\b/.test(combined)
  const hasOnsite = /\bonsite\b|\bon-site\b/.test(combined)
  const hasHybrid = /\bhybrid\b|\bpart(?:ial)?\s+remote\b/.test(combined)

  if (hasHybrid || (hasRemote && hasOnsite)) {
    return "hybrid"
  }
  if (hasRemote) {
    return "remote"
  }
  if (hasOnsite) {
    return "onsite"
  }
  return "unknown"
}

export function extractSalary(text: string): string {
  const plain = stripHtml(text)
  const match = plain.match(SALARY_PATTERN)
  return match?.[0]?.trim() ?? ""
}

function normalizePublishedAt(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString()
}

function resolveDescription(text: string): string {
  const parts = text.split(/<p>|\n/)
  const body = parts.slice(1).join(" ").trim()
  if (body.length > 0) {
    return stripHtml(body)
  }
  return ""
}

function adaptComment(comment: HnComment): JobOffer {
  const plainText = stripHtml(comment.text)
  const description = resolveDescription(comment.text)
  const fields = splitFields(firstLine(comment.text))
  const url = extractUrl(comment.text, comment.id)
  const title = resolveTitle(fields, comment.text)
  const company = resolveCompany(fields, url)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location: resolveLocation(fields, plainText),
    remote: resolveRemote(fields, plainText),
    salary: extractSalary(comment.text),
    description,
    publishedAt: normalizePublishedAt(comment.time),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = hnPayloadSchema.parse(rawPayload)
  return parsed.comments.map(adaptComment)
}
