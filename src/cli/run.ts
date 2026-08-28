import { confPathFromArgv } from "./args.ts"
import { loadConfig } from "../core/load-config.ts"
import { fetchAllSources } from "../core/fetch-service.ts"
import { processOffers } from "../core/pipeline.ts"
import { ErrorLog, writeErrorLogIfNonEmpty } from "../core/error-log.ts"
import {
  createNotionClient,
  requireEnv,
  syncOffersToNotion,
} from "../core/notion-sync.ts"
import "../sources/register-adapters.ts"

const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH ?? "errors.log"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function main(): Promise<number> {
  const confPath = confPathFromArgv(
    process.argv.slice(2),
    "Usage: npm start -- --conf <path-to-yaml>",
  )

  const config = loadConfig(confPath)
  const enabledCount = config.sources.filter((source) => source.enabled).length
  if (enabledCount === 0) {
    throw new Error(`No enabled sources in ${confPath}`)
  }

  const errorLog = new ErrorLog()
  const fetchResults = await fetchAllSources(config.sources)

  let anyFetchOk = false
  const fetchedOffers = []

  for (const result of fetchResults) {
    if (result.ok) {
      anyFetchOk = true
      fetchedOffers.push(...result.offers)
    } else {
      errorLog.addSource(result.sourceId, result.error)
      console.error(`Source ${result.sourceId} failed: ${result.error}`)
    }
  }

  const offers = processOffers(fetchedOffers, config.forbiddenStrings)
  console.log(
    `Processed ${confPath}: ${fetchedOffers.length} fetched, ${offers.length} after filter/dedup`,
  )

  let notionOk = true
  try {
    const client = createNotionClient()
    const databaseId = requireEnv("NOTION_DATABASE_ID")
    const { created, updated } = await syncOffersToNotion(
      client,
      databaseId,
      offers,
    )
    console.log(`Notion sync: ${created} created, ${updated} updated`)
  } catch (err) {
    notionOk = false
    const message = errorMessage(err)
    errorLog.add("notion", message)
    console.error(`Notion sync failed: ${message}`)
  }

  if (writeErrorLogIfNonEmpty(ERROR_LOG_PATH, errorLog)) {
    console.error(`Wrote error log to ${ERROR_LOG_PATH}`)
  }

  if (!notionOk || (!anyFetchOk && enabledCount > 0)) {
    return 1
  }
  return 0
}

main()
  .then((code) => {
    if (code !== 0) {
      process.exit(code)
    }
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
