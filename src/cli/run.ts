import { confPathFromArgv } from "./args.ts"
import { loadConfig } from "../core/load-config.ts"
import "../sources/register-adapters.ts"

const confPath = confPathFromArgv(
  process.argv.slice(2),
  "Usage: npm start -- --conf <path-to-yaml>",
)

try {
  const config = loadConfig(confPath)
  const enabled = config.sources.filter((source) => source.enabled)
  console.log(
    `Loaded ${confPath}: ${enabled.length} enabled source(s), ${config.forbiddenStrings.length} forbidden string(s)`,
  )
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
