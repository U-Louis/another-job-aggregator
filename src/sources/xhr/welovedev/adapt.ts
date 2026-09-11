import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import {
  welovedevJobSchema,
  welovedevRemoteFilterSchema,
  type WelovedevJob,
} from "./schema.ts"
import { z } from "zod"

function hashDigits(url: string): string {
  const hex = createHash("sha256").update(url).digest("hex")
  const decimal = BigInt(`0x${hex}`).toString(10)
  return decimal.slice(0, 5).padStart(5, "0")
}

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function resolveCompany(job: WelovedevJob, url: string): string {
  const name = job.smallCompany?.companyName?.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(url)})`
}

function resolveLocation(job: WelovedevJob): string {
  const places = job.formattedPlaces ?? []
  return places
    .map((place) => place.trim())
    .filter((place) => place.length > 0)
    .join(" | ")
}

export function mapRemotePolicy(
  remote: z.infer<typeof welovedevRemoteFilterSchema> | undefined,
): RemotePolicy {
  switch (remote) {
    case "fullTime":
      return "remote"
    case "hybrid":
    case "regularly":
    case "occasionally":
      return "hybrid"
    case "no":
      return "onsite"
    default:
      return "unknown"
  }
}

export function buildJobUrl(job: WelovedevJob): string {
  return `${WELOVEDEV_JOBS_BASE}/${job.seoAlias}`
}

export const WELOVEDEV_JOBS_BASE = "https://welovedevs.com/app/jobs"

export function formatSalary(job: WelovedevJob): string {
  const salary = job.details?.salary
  if (salary === undefined) {
    return ""
  }

  const currency = salary.currency?.trim()
  const suffix = currency ? ` ${currency}` : ""
  const min = salary.min ?? salary.maxPerYear ?? undefined
  const max = salary.max ?? salary.maxPerYear ?? undefined

  if (min !== undefined && max !== undefined && min !== max) {
    return `${min} - ${max}${suffix}`
  }
  if (min !== undefined) {
    return `${min}+${suffix}`
  }
  if (max !== undefined) {
    return `${max}${suffix}`
  }
  return ""
}

function buildDescription(job: WelovedevJob): string {
  const markdown = job.mdDescription?.trim()
  if (markdown) {
    return stripMarkdown(markdown)
  }

  return job.descriptionPreview?.trim() ?? ""
}

function normalizePublishedAt(job: WelovedevJob): string {
  const timestamp = job.publishDate ?? job.createdAt
  if (timestamp === undefined) {
    return new Date(0).toISOString()
  }
  return new Date(timestamp).toISOString()
}

function adaptJob(job: WelovedevJob): JobOffer {
  const title = job.title.trim()
  const url = buildJobUrl(job)
  const company = resolveCompany(job, url)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location: resolveLocation(job),
    remote: mapRemotePolicy(job.details?.remotePolicy?.frequency),
    salary: formatSalary(job),
    description: buildDescription(job),
    publishedAt: normalizePublishedAt(job),
    source: "",
  }
}

const welovedevAdaptPayloadSchema = z.object({
  hits: z.array(welovedevJobSchema),
})

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = welovedevAdaptPayloadSchema.parse(rawPayload)
  return parsed.hits.map(adaptJob)
}
