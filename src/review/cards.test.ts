import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildStatusUpdate,
  isReviewDecision,
  toReviewCards,
  type NotionPageLike,
} from "./cards.ts"

function page(
  id: string,
  status: string | null,
  publishedAt: string,
): NotionPageLike {
  return {
    id,
    properties: {
      Title: { type: "title", title: [{ plain_text: `Role ${id}` }] },
      Company: { type: "rich_text", rich_text: [{ plain_text: "Acme" }] },
      URL: { type: "url", url: `https://example.com/${id}` },
      Location: { type: "rich_text", rich_text: [{ plain_text: "Paris" }] },
      Remote: { type: "select", select: { name: "remote" } },
      Salary: { type: "rich_text", rich_text: [{ plain_text: "" }] },
      Description: { type: "rich_text", rich_text: [{ plain_text: "Build things" }] },
      PublishedAt: { type: "rich_text", rich_text: [{ plain_text: publishedAt }] },
      Source: { type: "rich_text", rich_text: [{ plain_text: "adzuna" }] },
      Status: { type: "select", select: status ? { name: status } : null },
    },
  }
}

test("toReviewCards keeps empty Status and sorts newest first", () => {
  const cards = toReviewCards([
    page("old", null, "2026-01-01T00:00:00.000Z"),
    page("done", "interesting", "2026-06-01T00:00:00.000Z"),
    page("new", null, "2026-03-01T00:00:00.000Z"),
    page("archived", "archived", "2026-02-01T00:00:00.000Z"),
  ])

  assert.deepEqual(
    cards.map((card) => card.id),
    ["new", "old"],
  )
  assert.equal(cards[0]?.title, "Role new")
  assert.equal(cards[0]?.url, "https://example.com/new")
  assert.equal(cards[0]?.remote, "remote")
})

test("toReviewCards can keep a single status", () => {
  const cards = toReviewCards(
    [
      page("open", null, "2026-04-01T00:00:00.000Z"),
      page("kept", "interesting", "2026-01-01T00:00:00.000Z"),
      page("newer", "interesting", "2026-05-01T00:00:00.000Z"),
      page("gone", "archived", "2026-06-01T00:00:00.000Z"),
    ],
    "interesting",
  )

  assert.deepEqual(
    cards.map((card) => card.id),
    ["newer", "kept"],
  )
})

test("isReviewDecision accepts interesting, archived, and applied", () => {
  assert.equal(isReviewDecision("interesting"), true)
  assert.equal(isReviewDecision("archived"), true)
  assert.equal(isReviewDecision("applied"), true)
  assert.equal(isReviewDecision("hired"), false)
  assert.equal(isReviewDecision(null), false)
})

test("buildStatusUpdate sets the Status select", () => {
  assert.deepEqual(buildStatusUpdate("interesting"), {
    Status: { select: { name: "interesting" } },
  })
  assert.deepEqual(buildStatusUpdate("archived"), {
    Status: { select: { name: "archived" } },
  })
  assert.deepEqual(buildStatusUpdate("applied"), {
    Status: { select: { name: "applied" } },
  })
})
