import { ErrorLog, writeErrorLogIfNonEmpty } from "../core/error-log.ts"
import { deleteStalePages } from "../core/notion-cleanup.ts"
import { createNotionClient, requireEnv } from "../core/notion-sync.ts"

const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH ?? "errors.log"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function main(): Promise<number> {
  const errorLog = new ErrorLog()
  const summary = await deleteStalePages(
    createNotionClient(),
    requireEnv("NOTION_DATABASE_ID"),
    new Date(),
    (message) => {
      errorLog.add("cleanup", message)
      console.error(`Cleanup: ${message}`)
    },
  )
  console.log(`Cleanup: ${summary.deleted} deleted, ${summary.failed} failed`)

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
