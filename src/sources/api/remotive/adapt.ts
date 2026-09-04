import { createHash } from "node:crypto"
import { makeDedupKey } from "../../../core/normalize.ts"
import type { JobOffer } from "../../../types/job-offer.ts"
import { remotiveResponseSchema, type RemotiveJob } from "./schema.ts"

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

function resolveCompany(job: RemotiveJob): string {
  const name = job.company_name.trim()
  if (name) {
    return name
  }
  return `unknown (${hashDigits(job.url)})`
}

function resolveLocation(job: RemotiveJob): string {
  return job.candidate_required_location?.trim() ?? "Remote"
}

function normalizePublishedAt(value: string): string {
  return new Date(value).toISOString()
}

function adaptJob(job: RemotiveJob): JobOffer {
  const title = job.title.trim()
  const company = resolveCompany(job)

  return {
    dedupKey: makeDedupKey(title, company),
    title,
    company,
    url: job.url,
    location: resolveLocation(job),
    remote: "remote",
    salary: job.salary?.trim() ?? "",
    description: stripHtml(job.description),
    publishedAt: normalizePublishedAt(job.publication_date),
    source: "",
  }
}

export function adapt(rawPayload: unknown): JobOffer[] {
  const parsed = remotiveResponseSchema.parse(rawPayload)
  return parsed.jobs.map(adaptJob)
}
