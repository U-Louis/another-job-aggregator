import { z } from "zod"

export const welovedevRemoteFilterSchema = z.enum([
  "fullTime",
  "hybrid",
  "no",
  "regularly",
  "occasionally",
])

export const welovedevQuerySchema = z.object({
  query: z.string().optional(),
  where: z.string().optional(),
  remote: welovedevRemoteFilterSchema.optional(),
  exclude_remote: welovedevRemoteFilterSchema.optional(),
  around_lat: z.number().optional(),
  around_lng: z.number().optional(),
  around_radius: z.number().int().positive().optional(),
  hits_per_page: z.number().int().positive().max(100).optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type WelovedevQuery = z.infer<typeof welovedevQuerySchema>

export const welovedevRemotePolicySchema = z.object({
  frequency: welovedevRemoteFilterSchema.optional(),
  daysPerWeek: z.number().optional(),
  needToBeClose: z.boolean().optional(),
})

export const welovedevSalarySchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  maxPerYear: z.number().optional(),
  currency: z.string().optional(),
  recurrence: z.string().optional(),
})

export const welovedevDetailsSchema = z.object({
  remotePolicy: welovedevRemotePolicySchema.optional(),
  salary: welovedevSalarySchema.optional(),
})

export const welovedevSmallCompanySchema = z.object({
  companyName: z.string().optional(),
  seoAlias: z.string().optional(),
})

export const welovedevJobSchema = z.object({
  objectID: z.string(),
  id: z.string().optional(),
  title: z.string(),
  seoAlias: z.string(),
  status: z.string().optional(),
  publishDate: z.coerce.number().optional(),
  createdAt: z.coerce.number().optional(),
  descriptionPreview: z.string().optional(),
  mdDescription: z.string().optional(),
  formattedPlaces: z.array(z.string()).optional(),
  details: welovedevDetailsSchema.optional(),
  smallCompany: welovedevSmallCompanySchema.optional(),
})

export const welovedevSearchResultSchema = z.object({
  hits: z.array(welovedevJobSchema).default([]),
  nbHits: z.number().optional(),
  page: z.number().optional(),
})

export const welovedevResponseSchema = z.object({
  results: z.array(welovedevSearchResultSchema),
})

export type WelovedevJob = z.infer<typeof welovedevJobSchema>
