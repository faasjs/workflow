export type StepStatus = 'enabled' | 'disabled'

export type Step = {
  id: string
  name: string
  status: StepStatus

  createdAt: Date
  updatedAt: Date
}

declare module 'knex/types/tables' {
  interface Tables {
    steps: Step
  }
}
