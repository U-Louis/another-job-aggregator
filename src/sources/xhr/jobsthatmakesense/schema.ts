import { z } from "zod"

export const jtmsLocaleSchema = z.enum(["fr", "en"])
export const jtmsRemoteFilterSchema = z.enum([
  "full",
  "partial",
  "punctual",
  "no",
  "unknown",
])
export const jtmsSortBySchema = z.enum(["relevance", "date"])
export type JtmsSortBy = z.infer<typeof jtmsSortBySchema>

export const jtmsQuerySchema = z.object({
  query: z.string().optional(),
  locale: jtmsLocaleSchema.default("fr"),
  region: z.string().default("eu"),
  remote: jtmsRemoteFilterSchema.optional(),
  exclude_remote: jtmsRemoteFilterSchema.optional(),
  around_lat: z.number().optional(),
  around_lng: z.number().optional(),
  around_radius: z.number().int().positive().optional(),
  hits_per_page: z.number().int().positive().max(100).optional(),
  max_pages: z.number().int().positive().optional(),
  sort_by: jtmsSortBySchema.optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type JtmsQuery = z.infer<typeof jtmsQuerySchema>

export const jtmsLocationSchema = z.object({
  formattedAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

export const jtmsJobSchema = z.object({
  objectID: z.string(),
  id: z.string().optional(),
  title: z.string(),
  slug: z.string().optional(),
  locale: jtmsLocaleSchema.optional(),
  remote: jtmsRemoteFilterSchema.optional(),
  projectName: z.string().optional(),
  projectMission: z.string().optional(),
  content: z.string().optional(),
  contentMarkdown: z.string().optional(),
  profile: z.string().nullable().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  salaryCurrency: z.string().optional(),
  locations: z.array(jtmsLocationSchema).optional(),
  updatedAt: z.coerce.number().optional(),
  createdAt: z.coerce.number().optional(),
})

export const jtmsResponseSchema = z.object({
  hits: z.array(jtmsJobSchema),
})

export type JtmsJob = z.infer<typeof jtmsJobSchema>
