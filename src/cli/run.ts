import { loadConfig } from "../core/load-config.ts"

function confPathFromArgv(argv: string[]): string {
  const flagIndex = argv.indexOf("--conf")
  const path = flagIndex === -1 ? undefined : argv[flagIndex + 1]
  if (!path || path.startsWith("-")) {
    console.error("Usage: npm start -- --conf <path-to-yaml>")
    process.exit(1)
  }
  return path
}

const confPath = confPathFromArgv(process.argv.slice(2))

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
