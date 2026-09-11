import { z } from "zod"

export const wttjLocaleSchema = z.enum(["fr", "en"])
export const wttjRemoteFilterSchema = z.enum([
  "unknown",
  "no",
  "partial",
  "punctual",
  "fulltime",
])

export const wttjQuerySchema = z.object({
  query: z.string().optional(),
  locale: wttjLocaleSchema.default("fr"),
  country_code: z.string().length(2).optional(),
  where: z.string().optional(),
  remote: wttjRemoteFilterSchema.optional(),
  exclude_remote: wttjRemoteFilterSchema.optional(),
  hits_per_page: z.number().int().positive().max(100).optional(),
  max_pages: z.number().int().positive().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type WttjQuery = z.infer<typeof wttjQuerySchema>

export const wttjOfficeSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
})

export const wttjOrganizationSchema = z.object({
  name: z.string(),
  slug: z.string(),
})

export const wttjJobSchema = z.object({
  reference: z.string(),
  name: z.string(),
  slug: z.string(),
  summary: z.string().optional(),
  profile: z.string().nullable().optional(),
  key_missions: z.array(z.string()).optional(),
  language: z.string().optional(),
  remote: wttjRemoteFilterSchema.optional(),
  has_remote: z.boolean().optional(),
  published_at: z.string(),
  salary_minimum: z.number().nullable().optional(),
  salary_maximum: z.number().nullable().optional(),
  salary_yearly_minimum: z.number().nullable().optional(),
  salary_currency: z.string().nullable().optional(),
  salary_period: z.string().nullable().optional(),
  offices: z.array(wttjOfficeSchema).optional(),
  organization: wttjOrganizationSchema,
})

export const wttjResponseSchema = z.object({
  hits: z.array(wttjJobSchema),
})

export type WttjJob = z.infer<typeof wttjJobSchema>
