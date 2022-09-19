export type Step = {
  id: string
  name: string
  enabled: boolean
  roles: string[]
  actions: string[]

  createdAt: Date
  updatedAt: Date

  createdBy: string
  updatedBy: string
}
