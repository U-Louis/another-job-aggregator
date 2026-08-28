import type { FetchParams } from "../../types/fetch.ts"

export async function fetchXhr(_params: FetchParams): Promise<unknown> {
  throw new Error("XHR fetch is not implemented")
}
