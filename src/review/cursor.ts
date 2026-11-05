export type ReviewChatInput = {
  model: "grok-4.7"
  reasoningEffort: "medium"
  system: string
  user: string
  schema: Record<string, unknown>
}

export type CatalogModel = {
  id: string
  parameters?: Array<{
    id: string
    values: Array<{ value: string }>
  }>
}

export type ReviewModelSelection = {
  id: "grok-4.7"
  params: Array<{ id: string; value: string }>
}

const JSON_INSTRUCTION =
  'Reply with one JSON object only: {"ruleId":"<id or null>"}. No other text.'

/** grok-4.7 at medium effort and standard speed. Fast is explicitly off. */
export function selectGrokMedium(models: CatalogModel[]): ReviewModelSelection {
  const grok = models.find((model) => model.id === "grok-4.7")
  if (!grok) {
    throw new Error("grok-4.7 is not available for this Cursor API key")
  }

  const effort = grok.parameters?.find(
    (parameter) =>
      parameter.values.some((value) => value.value === "medium") &&
      parameter.values.some((value) => value.value === "low"),
  )
  if (!effort) {
    throw new Error("grok-4.7 has no medium effort for this Cursor API key")
  }

  const fast = grok.parameters?.find((parameter) => parameter.id === "fast")
  if (fast && !fast.values.some((value) => value.value === "false")) {
    throw new Error("grok-4.7 has no standard speed for this Cursor API key")
  }

  return {
    id: "grok-4.7",
    params: [
      { id: effort.id, value: "medium" },
      ...(fast ? [{ id: "fast", value: "false" }] : []),
    ],
  }
}

export function parseReviewReply(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fenced?.[1] ?? trimmed).trim()
  const start = body.indexOf("{")
  const end = body.lastIndexOf("}")
  if (start === -1 || end < start) {
    throw new Error("Cursor review reply was not JSON")
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown
  } catch {
    throw new Error("Cursor review reply was not JSON")
  }
}

export async function promptCursor(
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  const { Agent, Cursor } = await import("@cursor/sdk")
  const models = await Cursor.models.list({ apiKey })
  const model = selectGrokMedium(models)
  const result = await Agent.prompt(`${system}\n\n${JSON_INSTRUCTION}\n\n${user}`, {
    apiKey,
    model,
    cloud: { repos: [] },
  })
  if (result.status !== "finished" || typeof result.result !== "string") {
    throw new Error(result.error?.message ?? `Cursor review run ${result.status}`)
  }
  return result.result
}

export async function completeCursorReview(
  apiKey: string,
  input: ReviewChatInput,
  ask: (apiKey: string, system: string, user: string) => Promise<string> = promptCursor,
): Promise<unknown> {
  return parseReviewReply(await ask(apiKey, input.system, input.user))
}
