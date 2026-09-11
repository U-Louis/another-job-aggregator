import assert from "node:assert/strict"
import { test } from "node:test"
import { fetchPayload } from "./fetch.ts"

test("fetchPayload discovers the latest thread and fetches top-level comments", async () => {
  const requestedUrls: string[] = []
  const fetchImpl = (async (input) => {
    const url = String(input)
    requestedUrls.push(url)

    if (url.includes("search_by_date")) {
      return new Response(
        JSON.stringify({
          hits: [
            {
              objectID: "100",
              title: "Ask HN: Who wants to be hired? (September 2026)",
            },
            {
              objectID: "200",
              title: "Ask HN: Who is hiring? (September 2026)",
            },
          ],
        }),
        { status: 200 },
      )
    }

    if (url.endsWith("/200.json")) {
      return new Response(JSON.stringify({ id: 200, kids: [301, 302] }), {
        status: 200,
      })
    }

    if (url.endsWith("/301.json")) {
      return new Response(
        JSON.stringify({
          id: 301,
          text: "Acme | Engineer | Remote",
          time: 1700000000,
          by: "acme",
        }),
        { status: 200 },
      )
    }

    if (url.endsWith("/302.json")) {
      return new Response(JSON.stringify({ id: 302, deleted: true }), {
        status: 200,
      })
    }

    throw new Error(`Unexpected fetch URL: ${url}`)
  }) as typeof fetch

  const payload = await fetchPayload({}, fetchImpl)

  assert.equal(payload.threadId, 200)
  assert.equal(payload.threadTitle, "Ask HN: Who is hiring? (September 2026)")
  assert.equal(payload.comments.length, 1)
  assert.equal(payload.comments[0]?.id, 301)
  assert.ok(requestedUrls.some((url) => url.includes("search_by_date")))
  assert.ok(requestedUrls.some((url) => url.endsWith("/200.json")))
})

test("fetchPayload uses thread_id when provided", async () => {
  const fetchImpl = (async (input) => {
    const url = String(input)

    if (url.endsWith("/555.json")) {
      return new Response(JSON.stringify({ id: 555, kids: [901] }), {
        status: 200,
      })
    }

    if (url.endsWith("/901.json")) {
      return new Response(
        JSON.stringify({
          id: 901,
          text: "Beta | Backend Engineer | Berlin",
          time: 1700000001,
        }),
        { status: 200 },
      )
    }

    throw new Error(`Unexpected fetch URL: ${url}`)
  }) as typeof fetch

  const payload = await fetchPayload({ thread_id: 555 }, fetchImpl)

  assert.equal(payload.threadId, 555)
  assert.equal(payload.comments.length, 1)
  assert.equal(payload.comments[0]?.id, 901)
})
