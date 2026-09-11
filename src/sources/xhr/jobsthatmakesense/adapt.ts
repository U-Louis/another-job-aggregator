import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import {
  jtmsResponseSchema,
  type JtmsJob,
  type JtmsRemoteFilterSchema,
} from "./schema.ts"
import type { z } from "zod"

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

function resolveCompany(job: JtmsJob, url: string): string {
  const name = job.projectName?.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(url)})`
}

function resolveLocation(job: JtmsJob): string {
  const locations = job.locations ?? []
  if (locations.length === 0) {
    return ""
  }

  return locations
    .map((location) => {
      const formatted = location.formattedAddress?.trim()
      if (formatted) {
        return formatted
      }
      const city = location.city?.trim()
      const country = location.country?.trim()
      if (city && country) {
        return `${city}, ${country}`
      }
      return city ?? country ?? ""
    })
    .filter((value) => value.length > 0)
    .join(" | ")
}

export function mapRemotePolicy(
  remote: z.infer<typeof JtmsRemoteFilterSchema> | undefined,
): RemotePolicy {
  switch (remote) {
    case "full":
      return "remote"
    case "partial":
    case "punctual":
      return "hybrid"
    case "no":
      return "onsite"
    default:
      return "unknown"
  }
}

export const JTMS_JOBS_BASE = "https://jobs.makesense.org"

export function buildJobUrl(job: JtmsJob): string {
  const locale = job.locale?.trim() || "fr"
  const slug = job.slug?.trim() || job.objectID
  return `${JTMS_JOBS_BASE}/${locale}/jobs/${slug}`
}

export function formatSalary(job: JtmsJob): string {
  const currency = job.salaryCurrency?.trim()
  const suffix = currency ? ` ${currency}` : ""
  const min = job.salaryMin
  const max = job.salaryMax

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

function buildDescription(job: JtmsJob): string {
  const markdown = job.contentMarkdown?.trim()
  if (markdown) {
    return stripHtml(markdown)
  }

  const content = job.content?.trim()
  if (content) {
    return stripHtml(content)
  }

  const profile = job.profile?.trim()
  if (profile) {
    return stripHtml(profile)
  }

  return job.projectMission?.trim() ?? ""
}

function normalizePublishedAt(job: JtmsJob): string {
  const timestamp = job.updatedAt ?? job.createdAt
  if (timestamp === undefined) {
    return new Date(0).toISOString()
  }
  return new Date(timestamp * 1000).toISOString()
}

function adaptJob(job: JtmsJob): JobOffer {
  const title = job.title.trim()
  const url = buildJobUrl(job)
  const company = resolveCompany(job, url)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location: resolveLocation(job),
    remote: mapRemotePolicy(job.remote),
    salary: formatSalary(job),
    description: buildDescription(job),
    publishedAt: normalizePublishedAt(job),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = jtmsResponseSchema.parse(rawPayload)
  return parsed.hits.map(adaptJob)
}
