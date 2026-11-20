import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer } from "../../../types/job-offer.ts"
import { himalayasResponseSchema, type HimalayasJob } from "./schema.ts"

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

function resolveCompany(job: HimalayasJob, url: string): string {
  const name = job.companyName.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(url)})`
}

function resolveLocation(restrictions: string[]): string {
  const parts = restrictions
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length === 0) {
    return "Worldwide"
  }
  return parts.join(", ")
}

export function formatSalary(job: HimalayasJob): string {
  const hasMin = job.minSalary !== null && job.minSalary !== undefined
  const hasMax = job.maxSalary !== null && job.maxSalary !== undefined

  let range = ""
  if (hasMin && hasMax) {
    range = `${job.minSalary} - ${job.maxSalary}`
  } else if (hasMin) {
    range = `${job.minSalary}+`
  } else if (hasMax) {
    range = `up to ${job.maxSalary}`
  } else {
    return ""
  }

  const suffix = [job.currency, job.salaryPeriod]
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ")

  if (!suffix) {
    return range
  }
  return `${range} ${suffix}`
}

function normalizePublishedAt(pubDate: number): string {
  const parsed = new Date(pubDate * 1000)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString()
  }
  return parsed.toISOString()
}

function adaptJob(job: HimalayasJob): JobOffer | undefined {
  const title = job.title.trim()
  const url = job.applicationLink.trim()
  if (!title || !url) {
    return undefined
  }

  const company = resolveCompany(job, url)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location: resolveLocation(job.locationRestrictions),
    remote: "remote",
    salary: formatSalary(job),
    description: stripHtml(job.description),
    publishedAt: normalizePublishedAt(job.pubDate),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = himalayasResponseSchema.parse(rawPayload)
  return parsed.jobs
    .map(adaptJob)
    .filter((offer): offer is JobOffer => offer !== undefined)
}
