import { z } from "zod"

export const hackernewsQuerySchema = z.object({
  thread_id: z.number().int().positive().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type HackernewsQuery = z.infer<typeof hackernewsQuerySchema>

export const hnCommentSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.number(),
  by: z.string().optional(),
})

export type HnComment = z.infer<typeof hnCommentSchema>

export const hnPayloadSchema = z.object({
  threadId: z.number(),
  threadTitle: z.string(),
  comments: z.array(hnCommentSchema),
})

export type HnPayload = z.infer<typeof hnPayloadSchema>

export const hnAlgoliaStoryHitSchema = z.object({
  objectID: z.string(),
  title: z.string(),
})

export const hnAlgoliaSearchSchema = z.object({
  hits: z.array(hnAlgoliaStoryHitSchema),
})

export const hnStorySchema = z.object({
  id: z.number(),
  kids: z.array(z.number()).optional(),
})

export const hnItemSchema = z.object({
  id: z.number(),
  text: z.string().optional(),
  time: z.number().optional(),
  by: z.string().optional(),
  dead: z.boolean().optional(),
  deleted: z.boolean().optional(),
})
