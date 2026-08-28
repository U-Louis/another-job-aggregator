import { z } from "zod"

export const sourceTypeSchema = z.enum([
  "rss",
  "api",
  "xhr",
  "external-scraper",
])

export type SourceType = z.infer<typeof sourceTypeSchema>

export const sourceEntrySchema = z.object({
  id: z.string().min(1),
  type: sourceTypeSchema,
  provider: z.string().min(1),
  enabled: z.boolean(),
  query: z.record(z.string(), z.unknown()),
})

export type SourceEntry = z.infer<typeof sourceEntrySchema>

export const configSchema = z.object({
  forbiddenStrings: z.array(z.string()).default([]),
  sources: z.array(sourceEntrySchema),
})

export type Config = z.infer<typeof configSchema>
