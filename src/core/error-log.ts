import { writeFileSync } from "node:fs"

export type ErrorLogEntry = {
  scope: string
  message: string
}

export class ErrorLog {
  readonly entries: ErrorLogEntry[] = []

  add(scope: string, message: string): void {
    this.entries.push({ scope, message })
  }

  addSource(sourceId: string, message: string): void {
    this.add(sourceId, message)
  }

  isEmpty(): boolean {
    return this.entries.length === 0
  }

  format(): string {
    if (this.entries.length === 0) {
      return ""
    }
    return (
      this.entries.map(({ scope, message }) => `${scope}: ${message}`).join("\n") +
      "\n"
    )
  }
}

/** Write the log to disk only when it contains entries. Returns whether a file was written. */
export function writeErrorLogIfNonEmpty(path: string, log: ErrorLog): boolean {
  if (log.isEmpty()) {
    return false
  }
  writeFileSync(path, log.format(), "utf8")
  return true
}
