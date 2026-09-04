import { z } from "zod"

export const linkedinRemoteSchema = z.enum(["Remote", "On-site", "Hybrid"])
export const linkedinTimeRangeSchema = z.enum([
  "Past 24 hours",
  "Past week",
  "Past month",
])

export const linkedinQuerySchema = z.object({
  keyword: z.string().min(1),
  location: z.string().optional(),
  country: z.string().length(2).optional(),
  remote: linkedinRemoteSchema.optional(),
  time_range: linkedinTimeRangeSchema.optional(),
  job_type: z.string().optional(),
  experience_level: z.string().optional(),
  limit: z.number().int().positive().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type LinkedInQuery = z.infer<typeof linkedinQuerySchema>

export const linkedinBaseSalarySchema = z.object({
  currency: z.string().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  payment_period: z.string().optional(),
})

export const linkedinJobSchema = z.object({
  url: z.string(),
  job_title: z.string(),
  company_name: z.string().optional(),
  job_location: z.string().optional(),
  job_summary: z.string().optional(),
  job_posted_date: z.string().optional(),
  job_base_pay_range: z.string().optional(),
  base_salary: linkedinBaseSalarySchema.nullable().optional(),
  discovery_input: z
    .object({
      remote: z.string().optional(),
    })
    .optional(),
})

export const linkedinResponseSchema = z.array(linkedinJobSchema)

export type LinkedInJob = z.infer<typeof linkedinJobSchema>
