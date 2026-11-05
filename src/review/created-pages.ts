import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import type { CreatedNotionPage } from "../core/notion-sync.ts"

export const CREATED_PAGES_PATH = "review-created.json"

const createdPageSchema = z.object({
  pageId: z.string().min(1),
  offer: z.object({
    dedupKey: z.string(),
    title: z.string(),
    company: z.string(),
    url: z.string(),
    location: z.string(),
    remote: z.enum(["onsite", "hybrid", "remote", "unknown"]),
    salary: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    source: z.string(),
  }),
})

const createdPagesSchema = z.array(createdPageSchema)

export function writeCreatedPages(path: string, pages: CreatedNotionPage[]): void {
  writeFileSync(path, JSON.stringify(pages), "utf8")
}

/** Read every `review-created.json` under `dir`, including one file per source artifact. */
export function readCreatedPages(dir: string): CreatedNotionPage[] {
  let entries: string[]
  try {
    entries = readdirSync(dir, { recursive: true, encoding: "utf8" })
  } catch (err) {
    if (isMissingDir(err)) return []
    throw err
  }

  const pages: CreatedNotionPage[] = []
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    const parsed: unknown = JSON.parse(readFileSync(join(dir, entry), "utf8"))
    pages.push(...createdPagesSchema.parse(parsed))
  }
  return pages
}

function isMissingDir(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "ENOENT"
  )
}
