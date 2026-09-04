import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer } from "../../../types/job-offer.ts"
import { remoteokJobSchema, type RemoteOkJob } from "./schema.ts"

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

function resolveCompany(job: RemoteOkJob): string {
  const name = job.company.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(job.url)})`
}

function resolveLocation(job: RemoteOkJob): string {
  const location = job.location?.trim()
  if (location) {
    return location
  }
  return "Remote"
}

function resolveUrl(job: RemoteOkJob): string {
  const url = job.url.trim()
  if (url) {
    return url
  }
  return job.apply_url?.trim() ?? ""
}

export function formatSalary(job: RemoteOkJob): string {
  const min = job.salary_min ?? 0
  const max = job.salary_max ?? 0

  if (min > 0 && max > 0) {
    return `${min} - ${max}`
  }
  if (min > 0) {
    return `${min}+`
  }
  if (max > 0) {
    return `up to ${max}`
  }
  return ""
}

function normalizePublishedAt(value: string): string {
  return new Date(value).toISOString()
}

function isJobRecord(value: unknown): value is RemoteOkJob {
  const parsed = remoteokJobSchema.safeParse(value)
  return parsed.success
}

function adaptJob(job: RemoteOkJob): JobOffer {
  const title = job.position.trim()
  const company = resolveCompany(job)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url: resolveUrl(job),
    location: resolveLocation(job),
    remote: "remote",
    salary: formatSalary(job),
    description: stripHtml(job.description),
    publishedAt: normalizePublishedAt(job.date),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  if (!Array.isArray(rawPayload)) {
    throw new Error("Remote OK payload must be a JSON array")
  }

  return rawPayload.filter(isJobRecord).map(adaptJob)
}
