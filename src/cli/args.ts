export function confPathFromArgv(argv: string[], usage: string): string {
  const flagIndex = argv.indexOf("--conf")
  const path = flagIndex === -1 ? undefined : argv[flagIndex + 1]
  if (!path || path.startsWith("-")) {
    console.error(usage)
    process.exit(1)
  }
  return path
}
