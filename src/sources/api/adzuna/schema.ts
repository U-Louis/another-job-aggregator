import { z } from "zod"

export const adzunaQuerySchema = z.object({
  country: z.string().min(1),
  what: z.string().optional(),
  where: z.string().optional(),
  what_exclude: z.string().optional(),
})

export type AdzunaQuery = z.infer<typeof adzunaQuerySchema>

export const adzunaJobSchema = z.object({
  title: z.string(),
  redirect_url: z.string(),
  created: z.string(),
  description: z.string(),
  location: z.object({
    display_name: z.string(),
  }),
  company: z
    .object({
      display_name: z.string().optional(),
    })
    .optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
})

export const adzunaResponseSchema = z.object({
  results: z.array(adzunaJobSchema),
})

export type AdzunaJob = z.infer<typeof adzunaJobSchema>
