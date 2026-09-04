import { z } from "zod"

export const remoteokQuerySchema = z.object({
  tags: z.string().optional(),
  what_or: z.string().optional(),
  what_or_remote: z.string().optional(),
  what_exclude_remote: z.string().optional(),
})

export type RemoteOkQuery = z.infer<typeof remoteokQuerySchema>

export const remoteokJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string().optional(),
  url: z.string(),
  apply_url: z.string().optional(),
  position: z.string(),
  company: z.string(),
  company_logo: z.string().optional(),
  location: z.string().optional(),
  description: z.string(),
  date: z.string(),
  tags: z.array(z.string()).optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
})

export type RemoteOkJob = z.infer<typeof remoteokJobSchema>

export const remoteokResponseSchema = z.array(z.unknown())
