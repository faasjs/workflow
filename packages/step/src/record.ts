import type { Steps } from '@faasjs/workflow-types'

export type StepRecordAction = 'draft' | 'hang' | 'done' | 'cancel' | 'lock' | 'unlock' | 'undo'

export type StepRecordStatus = 'draft' | 'hanging' | 'locked' | 'done' | 'canceled'

export type StepRecord<T = any> = {
  id: string
  stepId: keyof Steps

  previousId: string
  ancestorIds: string[]

  status: StepRecordStatus

  data: T

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

  summary: string
  note: string
}
