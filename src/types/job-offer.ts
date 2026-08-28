import { z } from "zod"

export const remotePolicySchema = z.enum([
  "onsite",
  "hybrid",
  "remote",
  "unknown",
])

export type RemotePolicy = z.infer<typeof remotePolicySchema>

export const jobOfferSchema = z.object({
  dedupKey: z.string(),
  title: z.string(),
  company: z.string(),
  url: z.string(),
  location: z.string(),
  remote: remotePolicySchema,
  salary: z.string(),
  description: z.string(),
  publishedAt: z.string(),
  source: z.string(),
})

export type JobOffer = z.infer<typeof jobOfferSchema>
