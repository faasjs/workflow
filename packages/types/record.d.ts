import type { Steps } from './steps'

export type StepRecordAction = 'draft' | 'hang' | 'done' | 'cancel' | 'lock' | 'unlock' | 'undo'

export type StepRecordStatus = 'draft' | 'hanging' | 'locked' | 'done' | 'canceled'

export type StepRecord<TData = any, TSummary = any> = {
  id: string
  stepId: keyof Steps

  previousId: string
  previousStepId: string
  previousUserId: string

  ancestorIds: string[]

  status: StepRecordStatus

  data: TData

  userId: string

  createdAt: Date
  createdBy: string

  updatedAt: Date
  updatedBy: string

  doneAt: Date
  hangedAt: Date
  canceledAt: Date
  lockedAt: Date
  unlockedAt: Date
  undoAt: Date

  /** doneAt - createdAt  */
  duration: number

  summary: TSummary
  note: string
}
