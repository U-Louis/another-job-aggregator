import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer, RemotePolicy } from "../../../types/job-offer.ts"
import { larajobsResponseSchema, type LarajobsJob } from "./schema.ts"

function hashDigits(url: string): string {
  const hex = createHash("sha256").update(url).digest("hex")
  const decimal = BigInt(`0x${hex}`).toString(10)
  return decimal.slice(0, 5).padStart(5, "0")
}

function resolveCompany(job: LarajobsJob, url: string): string {
  const name = job.organization.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(url)})`
}

function canonicalUrl(raw: string): string {
  const trimmed = raw.trim()
  try {
    const url = new URL(trimmed)
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key)
      }
    }
    return url.toString()
  } catch {
    return trimmed
  }
}

export function resolveRemote(location: string): RemotePolicy {
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

function resolveDescription(job: LarajobsJob): string {
  return (job.tags ?? [])
    .map((tag) => tag.name.trim())
    .filter((name) => name.length > 0)
    .join(", ")
}

function resolveSalary(job: LarajobsJob): string {
  return job.salary?.trim() ?? ""
}

function normalizePublishedAt(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString()
  }
  return parsed.toISOString()
}

function adaptJob(job: LarajobsJob): JobOffer | undefined {
  const title = job.title.trim()
  const url = canonicalUrl(job.url)
  if (!title || !url) {
    return undefined
  }

  const company = resolveCompany(job, url)
  const location = job.location.trim()

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url,
    location,
    remote: resolveRemote(location),
    salary: resolveSalary(job),
    description: resolveDescription(job),
    publishedAt: normalizePublishedAt(job.published_at),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const jobs = larajobsResponseSchema.parse(rawPayload)
  return jobs
    .map(adaptJob)
    .filter((offer): offer is JobOffer => offer !== undefined)
}
