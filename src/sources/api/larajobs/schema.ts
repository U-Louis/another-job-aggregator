import { z } from "zod"

export const larajobsQuerySchema = z.object({
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type LarajobsQuery = z.infer<typeof larajobsQuerySchema>

export const larajobsTagSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
})

export const larajobsJobSchema = z.object({
  id: z.number(),
  organization: z.string(),
  title: z.string(),
  location: z.string(),
  type: z.string().optional(),
  url: z.string(),
  salary: z.string().nullable().optional(),
  published_at: z.string(),
  tags: z.array(larajobsTagSchema).optional(),
})

export type LarajobsJob = z.infer<typeof larajobsJobSchema>

export const larajobsResponseSchema = z.array(larajobsJobSchema)
