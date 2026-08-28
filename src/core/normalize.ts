/** Lowercase, strip punctuation, trim, collapse internal whitespace. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .trim()
    .replace(/\s+/g, " ")
}

export function makeDedupKey(title: string, company: string): string {
  return `${normalize(title)} | ${normalize(company)}`
}
