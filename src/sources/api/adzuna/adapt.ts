import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer } from "../../../types/job-offer.ts"
import { adzunaResponseSchema, type AdzunaJob } from "./schema.ts"

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

function resolveCompany(job: AdzunaJob): string {
  const name = job.company?.display_name?.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(job.redirect_url)})`
}

export function formatSalary(job: AdzunaJob): string {
  const currency = job.salary_currency?.trim()
  const suffix = currency ? ` ${currency}` : ""

  if (job.salary_min !== undefined && job.salary_max !== undefined) {
    return `${job.salary_min} - ${job.salary_max}${suffix}`
  }
  if (job.salary_min !== undefined) {
    return `${job.salary_min}+${suffix}`
  }
  return ""
}

function normalizePublishedAt(value: string): string {
  return new Date(value).toISOString()
}

function adaptJob(job: AdzunaJob): JobOffer {
  const title = job.title.trim()
  const company = resolveCompany(job)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url: job.redirect_url,
    location: job.location.display_name,
    remote: "unknown",
    salary: formatSalary(job),
    description: stripHtml(job.description),
    publishedAt: normalizePublishedAt(job.created),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = adzunaResponseSchema.parse(rawPayload)
  return parsed.results.map(adaptJob)
}
