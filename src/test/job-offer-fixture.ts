import type { JobOffer } from "../types/job-offer.ts"
import { makeDedupKey } from "../core/normalize.ts"

export function offer(overrides: Partial<JobOffer> = {}): JobOffer {
  const title = overrides.title ?? "Senior Engineer"
  const company = overrides.company ?? "Acme"
  return {
    title,
    company,
    dedupKey: overrides.dedupKey ?? makeDedupKey(title, company),
    url: "https://example.com/1",
    location: "Paris",
    remote: "unknown",
    salary: "",
    description: "A job",
    publishedAt: "2026-01-01T00:00:00Z",
    source: "adzuna-remote",
    ...overrides,
  }
}
