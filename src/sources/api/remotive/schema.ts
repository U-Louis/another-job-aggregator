import { z } from "zod"

export const remotiveQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  company_name: z.string().optional(),
  limit: z.number().int().positive().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type RemotiveQuery = z.infer<typeof remotiveQuerySchema>

export const remotiveJobSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  company_name: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  job_type: z.string().optional(),
  publication_date: z.string(),
  candidate_required_location: z.string().optional(),
  salary: z.string().optional(),
  description: z.string(),
})

export const remotiveResponseSchema = z.object({
  jobs: z.array(remotiveJobSchema),
})

export type RemotiveJob = z.infer<typeof remotiveJobSchema>
