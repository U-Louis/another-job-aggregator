export const STATUS_PROPERTY = "Status"
export const REVIEW_DECISIONS = ["interesting", "archived", "selected"] as const

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

export type ReviewCard = {
  id: string
  title: string
  company: string
  url: string
  location: string
  remote: string
  salary: string
  description: string
  publishedAt: string
  source: string
}

export type NotionPageLike = {
  id: string
  properties: Record<string, unknown>
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    typeof value === "string" &&
    (REVIEW_DECISIONS as readonly string[]).includes(value)
  )
}

export function buildStatusUpdate(
  decision: ReviewDecision,
): Record<string, unknown> {
  return {
    [STATUS_PROPERTY]: { select: { name: decision } },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function plainText(items: unknown): string {
  if (!Array.isArray(items)) return ""
  return items
    .map((item) =>
      isRecord(item) && typeof item.plain_text === "string" ? item.plain_text : "",
    )
    .join("")
}

function readText(property: unknown): string {
  if (!isRecord(property)) return ""
  if (property.type === "title") return plainText(property.title)
  if (property.type === "rich_text") return plainText(property.rich_text)
  return ""
}

function readUrl(property: unknown): string {
  if (!isRecord(property) || property.type !== "url") return ""
  return typeof property.url === "string" ? property.url : ""
}

function readSelect(property: unknown): string {
  if (!isRecord(property)) return ""
  const value =
    property.type === "select"
      ? property.select
      : property.type === "status"
        ? property.status
        : null
  if (!isRecord(value) || typeof value.name !== "string") return ""
  return value.name
}

/** Cards whose Status select equals `status` (`""` = empty). Newest publishedAt first. */
export function toReviewCards(pages: NotionPageLike[], status = ""): ReviewCard[] {
  const cards: ReviewCard[] = []
  for (const page of pages) {
    if (readSelect(page.properties[STATUS_PROPERTY]) !== status) continue
    cards.push({
      id: page.id,
      title: readText(page.properties.Title),
      company: readText(page.properties.Company),
      url: readUrl(page.properties.URL),
      location: readText(page.properties.Location),
      remote: readSelect(page.properties.Remote),
      salary: readText(page.properties.Salary),
      description: readText(page.properties.Description),
      publishedAt: readText(page.properties.PublishedAt),
      source: readText(page.properties.Source),
    })
  }
  cards.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return cards
}
