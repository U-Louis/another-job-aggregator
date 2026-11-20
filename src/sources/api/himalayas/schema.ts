import { z } from "zod"

export const himalayasQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.string().optional(),
  seniority: z.string().optional(),
  worldwide: z.boolean().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type HimalayasQuery = z.infer<typeof himalayasQuerySchema>

export const himalayasJobSchema = z.object({
  title: z.string(),
  companyName: z.string(),
  applicationLink: z.string(),
  locationRestrictions: z.array(z.string()),
  minSalary: z.number().nullable().optional(),
  maxSalary: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  salaryPeriod: z.string().nullable().optional(),
  description: z.string(),
  pubDate: z.number(),
})

export type HimalayasJob = z.infer<typeof himalayasJobSchema>

export const himalayasResponseSchema = z.object({
  jobs: z.array(himalayasJobSchema),
})
