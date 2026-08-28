import { confPathFromArgv } from "./args.ts"
import { capturePayload } from "./capture-payload.ts"

const usage =
  "Usage: npm run test-payload -- --conf <path-to-yaml>"

const confPath = confPathFromArgv(process.argv.slice(2), usage)

try {
  const results = await capturePayload(confPath)
  for (const result of results) {
    console.log(
      `Saved ${result.sourceId} (${result.provider}) → ${result.path}`,
    )
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
