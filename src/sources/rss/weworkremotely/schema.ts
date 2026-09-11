import { z } from "zod"

export const weworkremotelyQuerySchema = z.object({
  feed_url: z.string().url(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type WeworkremotelyQuery = z.infer<typeof weworkremotelyQuerySchema>
