import { z } from "zod"
import {
  FETCH_BACKOFF_BASE_MS,
  FETCH_MAX_RETRIES,
} from "../types/fetch.ts"

const CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions"
const REVIEW_TIMEOUT_MS = 180_000

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
})

export type GrokChatInput = {
  model: "grok-4.7"
  reasoningEffort: "medium"
  system: string
  user: string
  schema: Record<string, unknown>
}

export class GrokRequestError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = "GrokRequestError"
    this.retryable = retryable
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function requestOnce(
  apiKey: string,
  input: GrokChatInput,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetchImpl(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        reasoning_effort: input.reasoningEffort,
        temperature: 0,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "review_verdict",
            strict: true,
            schema: input.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(REVIEW_TIMEOUT_MS),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new GrokRequestError(reason, true)
  }

  const body = await response.text()
  if (!response.ok) {
    throw new GrokRequestError(
      `Grok API ${response.status}: ${body.slice(0, 500)}`,
      isRetryableStatus(response.status),
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new GrokRequestError("Grok API returned non-JSON", false)
  }

  const completion = completionSchema.safeParse(parsed)
  if (!completion.success) {
    throw new GrokRequestError("Grok API response missing message content", false)
  }

  const content = completion.data.choices[0]?.message.content ?? ""
  try {
    return JSON.parse(content) as unknown
  } catch {
    throw new GrokRequestError("Grok API message was not JSON", false)
  }
}

export async function completeGrokChat(
  apiKey: string,
  input: GrokChatInput,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(FETCH_BACKOFF_BASE_MS * 2 ** (attempt - 1))
    }
    try {
      return await requestOnce(apiKey, input, fetchImpl)
    } catch (err) {
      lastError = err
      const retryable = err instanceof GrokRequestError && err.retryable
      if (!retryable || attempt >= FETCH_MAX_RETRIES) {
        throw err
      }
    }
  }
  throw lastError
}
