import { collectPaginatedAPI, isFullPage, type Client } from "@notionhq/client"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createNotionClient, requireEnv } from "../core/notion-sync.ts"
import {
  STATUS_PROPERTY,
  buildStatusUpdate,
  isReviewDecision,
  toReviewCards,
  type NotionPageLike,
} from "../review/cards.ts"

const HOST = "127.0.0.1"
const PORT = 4173
const PAGE_ID = /^[0-9a-f-]{32,36}$/i

const reviewDir = join(dirname(fileURLToPath(import.meta.url)), "../../review")
const htmlPath = join(reviewDir, "index.html")
const CREWMATES = new Set(["red.png", "blue.png", "green.png", "pink.png"])

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 2048) {
      throw new Error("Body too large")
    }
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function listCards(queue: "review" | "interesting") {
  const client = createNotionClient()
  const pages = await collectPaginatedAPI(client.databases.query, {
    database_id: requireEnv("NOTION_DATABASE_ID"),
    filter: {
      property: STATUS_PROPERTY,
      select:
        queue === "interesting" ? { equals: "interesting" } : { is_empty: true },
    },
  })

  const fullPages: NotionPageLike[] = []
  for (const page of pages) {
    if (isFullPage(page)) fullPages.push(page)
  }
  return toReviewCards(fullPages, queue === "interesting" ? "interesting" : "")
}

async function setDecision(pageId: string, decision: "interesting" | "archived" | "applied") {
  const client = createNotionClient()
  await client.pages.update({
    page_id: pageId,
    properties: buildStatusUpdate(decision) as Parameters<
      Client["pages"]["update"]
    >[0]["properties"],
  })
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${HOST}`)

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/victory")) {
    const html = await readFile(htmlPath)
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    })
    res.end(html)
    return
  }

  const crewmateFile = url.pathname.match(/^\/crewmates\/([a-z]+\.png)$/)?.[1]
  if (req.method === "GET" && crewmateFile && CREWMATES.has(crewmateFile)) {
    const png = await readFile(join(reviewDir, "crewmates", crewmateFile))
    res.writeHead(200, {
      "content-type": "image/png",
      "cache-control": "no-store",
    })
    res.end(png)
    return
  }

  if (req.method === "GET" && url.pathname === "/api/jobs") {
    const queue = url.searchParams.get("queue") ?? "review"
    if (queue !== "review" && queue !== "interesting") {
      sendJson(res, 400, { error: "Queue must be review or interesting" })
      return
    }
    sendJson(res, 200, { jobs: await listCards(queue) })
    return
  }

  const match = url.pathname.match(/^\/api\/jobs\/([^/]+)$/)
  if (req.method === "POST" && match) {
    const pageId = decodeURIComponent(match[1] ?? "")
    if (!PAGE_ID.test(pageId)) {
      sendJson(res, 400, { error: "Invalid page id" })
      return
    }
    const raw = await readBody(req)
    const body: unknown = raw ? JSON.parse(raw) : null
    const decision =
      body && typeof body === "object" && "decision" in body
        ? body.decision
        : undefined
    if (!isReviewDecision(decision)) {
      sendJson(res, 400, { error: "Decision must be interesting, archived, or applied" })
      return
    }
    await setDecision(pageId, decision)
    sendJson(res, 200, { ok: true })
    return
  }

  sendJson(res, 404, { error: "Not found" })
}

const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Request failed"
    if (!res.headersSent) sendJson(res, 500, { error: message })
    else res.end()
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Review http://${HOST}:${PORT}`)
})
