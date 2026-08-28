import type { FetchParams } from "../../types/fetch.ts"

export async function fetchRss(_params: FetchParams): Promise<unknown> {
  throw new Error("RSS fetch is not implemented")
}
