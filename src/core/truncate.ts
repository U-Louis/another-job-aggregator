const DESCRIPTION_LIMIT = 1900
const ELLIPSIS = "…"

/** Hard-slice at 1900 characters and append `…` when longer. */
export function truncateDescription(description: string): string {
  if (description.length <= DESCRIPTION_LIMIT) {
    return description
  }
  return description.slice(0, DESCRIPTION_LIMIT) + ELLIPSIS
}
