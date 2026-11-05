import { createNotionClient } from "../core/notion-sync.ts"
import { ErrorLog, writeErrorLogIfNonEmpty } from "../core/error-log.ts"
import { completeCursorReview } from "../review/cursor.ts"
import { readCreatedPages } from "../review/created-pages.ts"
import { reviewNewCards } from "../review/apply.ts"
import { REVIEW_RULES_PATH } from "../review/rules.ts"

const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH ?? "errors.log"
const CREATED_DIR = process.argv[2] ?? "review-created"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function main(): Promise<number> {
  const errorLog = new ErrorLog()
  const createdPages = readCreatedPages(CREATED_DIR)
  if (createdPages.length === 0) {
    console.log("Review: no new cards")
    return 0
  }

  await reviewNewCards({
    client: createNotionClient(),
    createdPages,
    rulesPath: REVIEW_RULES_PATH,
    apiKey: process.env.CURSOR_API_KEY,
    complete: (input) => completeCursorReview(process.env.CURSOR_API_KEY ?? "", input),
    onError: (message) => {
      errorLog.add("review", message)
      console.error(`Review: ${message}`)
    },
    log: (message) => console.log(message),
  })

  if (writeErrorLogIfNonEmpty(ERROR_LOG_PATH, errorLog)) {
    console.error(`Wrote error log to ${ERROR_LOG_PATH}`)
  }
  return errorLog.isEmpty() ? 0 : 1
}

main()
  .then((code) => {
    if (code !== 0) process.exit(code)
  })
  .catch((err: unknown) => {
    console.error(errorMessage(err))
    process.exit(1)
  })
