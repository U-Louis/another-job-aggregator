import type { SourceEntry } from "../types/config.ts"
import type { JobOffer } from "../types/job-offer.ts"

function normalizeTerms(terms: string[]): string[] {
  return terms
    .map((value) => value.toLowerCase().trim())
    .filter((value) => value.length > 0)
}

function termsFromSources(
  sources: SourceEntry[],
  field: "what_or" | "what_or_remote" | "what_exclude_remote",
): string[] {
  const terms = new Set<string>()
  for (const source of sources) {
    if (!source.enabled) {
      continue
    }
    const value = source.query[field]
    if (typeof value !== "string" || value.trim().length === 0) {
      continue
    }
    for (const term of value.split(/\s+/)) {
      if (term.length > 0) {
        terms.add(term)
      }
    }
  }
  return [...terms]
}

/** Space-separated query terms from enabled sources' `query.what_or`. */
export function requiredAnyOfFromSources(sources: SourceEntry[]): string[] {
  return termsFromSources(sources, "what_or")
}

/** Space-separated remote query terms from enabled sources' `query.what_or_remote`. */
export function requiredAnyOfRemoteFromSources(
  sources: SourceEntry[],
): string[] {
  return termsFromSources(sources, "what_or_remote")
}

/** Space-separated exclude terms from enabled sources' `query.what_exclude_remote`. */
export function excludedRemoteFromSources(sources: SourceEntry[]): string[] {
  return termsFromSources(sources, "what_exclude_remote")
}

function applyRequiredAnyOnHaystack(
  offers: JobOffer[],
  requiredAnyOf: string[],
  haystackFor: (offer: JobOffer) => string,
): JobOffer[] {
  const needles = normalizeTerms(requiredAnyOf)
  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const haystack = haystackFor(offer).toLowerCase()
    return needles.some((needle) => haystack.includes(needle))
  })
}

/** Keep offers where title or description contains at least one required term. */
export function applyRequiredAnyFilter(
  offers: JobOffer[],
  requiredAnyOf: string[],
): JobOffer[] {
  return applyRequiredAnyOnHaystack(
    offers,
    requiredAnyOf,
    (offer) => `${offer.title}\n${offer.description}`,
  )
}

/** Keep offers where title or description contains at least one remote term. */
export function applyRequiredAnyRemoteFilter(
  offers: JobOffer[],
  requiredAnyOf: string[],
): JobOffer[] {
  return applyRequiredAnyOnHaystack(
    offers,
    requiredAnyOf,
    (offer) => `${offer.title}\n${offer.description}`,
  )
}

/** Drop offers whose title or description contains any excluded remote term. */
export function applyExcludedRemoteFilter(
  offers: JobOffer[],
  excludedRemote: string[],
): JobOffer[] {
  const needles = normalizeTerms(excludedRemote)
  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const haystack = `${offer.title}\n${offer.description}`.toLowerCase()
    return !needles.some((needle) => haystack.includes(needle))
  })
}

/** Drop offers whose title contains any forbidden string (case-insensitive substring). */
export function applyForbiddenFilter(
  offers: JobOffer[],
  forbiddenStrings: string[],
): JobOffer[] {
  const needles = normalizeTerms(forbiddenStrings)

  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const title = offer.title.toLowerCase()
    return !needles.some((needle) => title.includes(needle))
  })
}
