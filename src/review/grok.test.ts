import assert from "node:assert/strict"
import { test } from "node:test"
import { completeGrokChat, type GrokChatInput } from "./grok.ts"

const input: GrokChatInput = {
  model: "grok-4.7",
  reasoningEffort: "medium",
  system: "rules",
  user: "Title: Engineer",
  schema: { type: "object" },
}

test("completeGrokChat posts the prompt and parses the verdict JSON", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"ruleId":"internship"}' } }],
      }),
      { status: 200 },
    )
  }) as typeof fetch

  const verdict = await completeGrokChat("secret-key", input, fetchImpl)
  assert.deepEqual(verdict, { ruleId: "internship" })

  const body = JSON.parse(String(calls[0]?.init?.body))
  assert.equal(calls[0]?.url, "https://api.x.ai/v1/chat/completions")
  assert.equal(
    (calls[0]?.init?.headers as Record<string, string>).authorization,
    "Bearer secret-key",
  )
  assert.equal(body.model, "grok-4.7")
  assert.equal(body.reasoning_effort, "medium")
  assert.equal(body.messages[0].content, "rules")
  assert.equal(body.messages[1].content, "Title: Engineer")
  assert.equal(body.response_format.json_schema.name, "review_verdict")
  assert.equal(body.response_format.json_schema.strict, true)
})

test("completeGrokChat does not retry a 400", async () => {
  let calls = 0
  const fetchImpl = (async () => {
    calls += 1
    return new Response("bad schema", { status: 400 })
  }) as typeof fetch

  await assert.rejects(
    () => completeGrokChat("secret-key", input, fetchImpl),
    /Grok API 400: bad schema/,
  )
  assert.equal(calls, 1)
})
