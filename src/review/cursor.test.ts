import assert from "node:assert/strict"
import { test } from "node:test"
import {
  completeCursorReview,
  selectGrokMedium,
  type ReviewChatInput,
} from "./cursor.ts"

const input: ReviewChatInput = {
  model: "grok-4.7",
  reasoningEffort: "medium",
  system: "rules",
  user: "Title: Engineer",
  schema: { type: "object" },
}

const catalog = [
  {
    id: "grok-4.7",
    parameters: [
      {
        id: "effort",
        values: [
          { value: "low" },
          { value: "medium" },
          { value: "high" },
          { value: "xhigh" },
        ],
      },
      {
        id: "fast",
        values: [{ value: "false" }, { value: "true" }],
      },
    ],
  },
]

test("selectGrokMedium pins medium effort and standard speed", () => {
  assert.deepEqual(selectGrokMedium(catalog), {
    id: "grok-4.7",
    params: [
      { id: "effort", value: "medium" },
      { id: "fast", value: "false" },
    ],
  })
})

test("selectGrokMedium rejects a catalog that only offers fast", () => {
  assert.throws(
    () =>
      selectGrokMedium([
        {
          id: "grok-4.7",
          parameters: [
            {
              id: "effort",
              values: [{ value: "low" }, { value: "medium" }],
            },
            { id: "fast", values: [{ value: "true" }] },
          ],
        },
      ]),
    /standard speed/,
  )
})

test("completeCursorReview parses a JSON verdict from the Cursor reply", async () => {
  const seen: Array<{ apiKey: string; system: string; user: string }> = []
  const verdict = await completeCursorReview(
    "cursor_test",
    input,
    async (apiKey, system, user) => {
      seen.push({ apiKey, system, user })
      return '```json\n{"ruleId":"internship"}\n```'
    },
  )

  assert.deepEqual(verdict, { ruleId: "internship" })
  assert.deepEqual(seen, [
    { apiKey: "cursor_test", system: "rules", user: "Title: Engineer" },
  ])
})

test("completeCursorReview rejects a reply that is not JSON", async () => {
  await assert.rejects(
    () => completeCursorReview("cursor_test", input, async () => "keep it"),
    /not JSON/,
  )
})
