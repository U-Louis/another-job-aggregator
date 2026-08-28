export type RemotePolicy = "onsite" | "hybrid" | "remote" | "unknown"

export type JobOffer = {
  dedupKey: string
  title: string
  company: string
  url: string
  location: string
  remote: RemotePolicy
  salary: string
  description: string
  publishedAt: string
  source: string
}
