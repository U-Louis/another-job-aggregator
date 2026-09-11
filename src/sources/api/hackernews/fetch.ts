import { fetchApi } from "../fetch.ts"
import { HN_ALGOLIA_SEARCH_BY_DATE_URL } from "./query.ts"
import {
  hackernewsQuerySchema,
  hnAlgoliaSearchSchema,
  hnItemSchema,
  hnStorySchema,
  type HackernewsQuery,
  type HnComment,
  type HnPayload,
} from "./schema.ts"

const HN_ITEM_BASE_URL = "https://hacker-news.firebaseio.com/v0/item"
const WHO_IS_HIRING_TITLE = /^Ask HN: Who is hiring\b/i
const FETCH_CONCURRENCY = 10

function isWhoIsHiringTitle(title: string): boolean {
  return WHO_IS_HIRING_TITLE.test(title)
}

async function findLatestThreadId(
  fetchImpl: typeof fetch,
): Promise<{ threadId: number; threadTitle: string }> {
  const url = new URL(HN_ALGOLIA_SEARCH_BY_DATE_URL)
  url.searchParams.set("tags", "story,ask_hn")
  url.searchParams.set("query", "Who is hiring")
  url.searchParams.set("hitsPerPage", "20")

  const rawPayload = await fetchApi({ url: url.toString() }, fetchImpl)
  const parsed = hnAlgoliaSearchSchema.parse(rawPayload)

  for (const hit of parsed.hits) {
    if (isWhoIsHiringTitle(hit.title)) {
      return {
        threadId: Number(hit.objectID),
        threadTitle: hit.title,
      }
    }
  }

  throw new Error('No "Ask HN: Who is hiring" thread found')
}

async function fetchStory(
  threadId: number,
  fetchImpl: typeof fetch,
): Promise<number[]> {
  const rawPayload = await fetchApi(
    { url: `${HN_ITEM_BASE_URL}/${threadId}.json` },
    fetchImpl,
  )
  const story = hnStorySchema.parse(rawPayload)
  return story.kids ?? []
}

async function fetchComment(
  commentId: number,
  fetchImpl: typeof fetch,
): Promise<HnComment | undefined> {
  const rawPayload = await fetchApi(
    { url: `${HN_ITEM_BASE_URL}/${commentId}.json` },
    fetchImpl,
  )
  const item = hnItemSchema.parse(rawPayload)

  if (item.deleted || item.dead || !item.text || item.time === undefined) {
    return undefined
  }

  return {
    id: item.id,
    text: item.text,
    time: item.time,
    by: item.by,
  }
}

async function fetchComments(
  commentIds: number[],
  fetchImpl: typeof fetch,
): Promise<HnComment[]> {
  const comments: HnComment[] = []

  for (let index = 0; index < commentIds.length; index += FETCH_CONCURRENCY) {
    const batch = commentIds.slice(index, index + FETCH_CONCURRENCY)
    const results = await Promise.all(
      batch.map((commentId) => fetchComment(commentId, fetchImpl)),
    )
    for (const comment of results) {
      if (comment) {
        comments.push(comment)
      }
    }
  }

  return comments
}

export async function fetchPayload(
  query: HackernewsQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<HnPayload> {
  const parsed = hackernewsQuerySchema.parse(query)

  const thread = parsed.thread_id
    ? { threadId: parsed.thread_id, threadTitle: "Ask HN: Who is hiring" }
    : await findLatestThreadId(fetchImpl)

  const commentIds = await fetchStory(thread.threadId, fetchImpl)
  const comments = await fetchComments(commentIds, fetchImpl)

  return {
    threadId: thread.threadId,
    threadTitle: thread.threadTitle,
    comments,
  }
}
