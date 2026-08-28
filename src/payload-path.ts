import { join } from "node:path"

/** Captured API payloads (gitignored). Profile matches `configs/<profile>.yaml`. */
export function payloadPath(profile: string): string {
  return join("payloads", `${profile}.json`)
}
