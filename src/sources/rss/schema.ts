import { z } from "zod"

export const feedItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  id: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  publishedAt: z.string().optional(),
  author: z.string().optional(),
  categories: z.array(z.string()).optional(),
  extras: z.record(z.string(), z.string()).optional(),
})

export type FeedItem = z.infer<typeof feedItemSchema>

export const feedPayloadSchema = z.object({
  format: z.enum(["rss", "atom", "json"]),
  items: z.array(feedItemSchema),
})

export type FeedPayload = z.infer<typeof feedPayloadSchema>
