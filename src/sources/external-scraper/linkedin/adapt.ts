import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import {
  linkedinResponseSchema,
  type LinkedInJob,
} from "./schema.ts"

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

function resolveCompany(job: LinkedInJob): string {
  const name = job.company_name?.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(job.url)})`
}

export function formatSalary(job: LinkedInJob): string {
  const raw = job.job_base_pay_range?.trim()
  if (raw) {
    return raw
  }

  const salary = job.base_salary
  if (!salary) {
    return ""
  }

  const currency = salary.currency?.trim()
  const suffix = currency ? ` ${currency}` : ""
  const period = salary.payment_period?.trim()
  const periodSuffix = period ? `/${period}` : ""

  if (salary.min_amount !== undefined && salary.max_amount !== undefined) {
    return `${salary.min_amount} - ${salary.max_amount}${suffix}${periodSuffix}`
  }
  if (salary.min_amount !== undefined) {
    return `${salary.min_amount}+${suffix}${periodSuffix}`
  }
  return ""
}

function resolveRemote(job: LinkedInJob): RemotePolicy {
  const remote = job.discovery_input?.remote?.trim().toLowerCase()
  if (remote === "remote") {
    return "remote"
  }
  if (remote === "hybrid") {
    return "hybrid"
  }
  if (remote === "on-site" || remote === "onsite") {
    return "onsite"
  }
  return "unknown"
}

function normalizePublishedAt(job: LinkedInJob): string {
  if (job.job_posted_date?.trim()) {
    return new Date(job.job_posted_date).toISOString()
  }
  throw new Error(`Missing job_posted_date for job ${job.url}`)
}

function adaptJob(job: LinkedInJob): JobOffer {
  const title = job.job_title.trim()
  const company = resolveCompany(job)
  const description = stripHtml(job.job_summary ?? "")

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url: job.url,
    location: job.job_location?.trim() ?? "",
    remote: resolveRemote(job),
    salary: formatSalary(job),
    description,
    publishedAt: normalizePublishedAt(job),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = linkedinResponseSchema.parse(rawPayload)
  return parsed.map(adaptJob)
}
