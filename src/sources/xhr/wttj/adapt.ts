import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import { wttjResponseSchema, type WttjJob } from "./schema.ts"

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

function resolveCompany(job: WttjJob, url: string): string {
  const name = job.organization.name.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(url)})`
}

function resolveLocation(job: WttjJob): string {
  const offices = job.offices ?? []
  if (offices.length === 0) {
    return ""
  }

  return offices
    .map((office) => {
      const city = office.city?.trim()
      const country = office.country?.trim()
      if (city && country) {
        return `${city}, ${country}`
      }
      return city ?? country ?? ""
    })
    .filter((value) => value.length > 0)
    .join(" | ")
}

export function mapRemotePolicy(remote: WttjJob["remote"]): RemotePolicy {
  switch (remote) {
    case "fulltime":
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

export function buildJobUrl(job: WttjJob): string {
  const locale = job.language?.trim() || "fr"
  return `https://www.welcometothejungle.com/${locale}/companies/${job.organization.slug}/jobs/${job.slug}`
}

export function formatSalary(job: WttjJob): string {
  const currency = job.salary_currency?.trim()
  const suffix = currency ? ` ${currency}` : ""
  const min = job.salary_minimum ?? job.salary_yearly_minimum ?? undefined
  const max = job.salary_maximum ?? undefined

  if (min !== undefined && max !== undefined) {
    return `${min} - ${max}${suffix}`
  }
  if (min !== undefined) {
    return `${min}+${suffix}`
  }
  return ""
}

function buildDescription(job: WttjJob): string {
  const parts: string[] = []

  const summary = job.summary?.trim()
  if (summary) {
    parts.push(summary)
  }

  const missions = (job.key_missions ?? [])
    .map((mission) => mission.trim())
    .filter((mission) => mission.length > 0)
  if (missions.length > 0) {
    parts.push(missions.join("\n"))
  }

  const profile = job.profile?.trim()
  if (profile) {
    parts.push(stripHtml(profile))
  }

  return parts.join("\n\n")
}

function normalizePublishedAt(value: string): string {
  return new Date(value).toISOString()
}

function adaptJob(job: WttjJob): JobOffer {
  const title = job.name.trim()
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
    publishedAt: normalizePublishedAt(job.published_at),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = wttjResponseSchema.parse(rawPayload)
  return parsed.hits.map(adaptJob)
}
