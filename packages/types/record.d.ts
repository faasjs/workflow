import type { Steps } from './steps'

export type StepRecordAction =
  | 'draft'
  | 'hang'
  | 'done'
  | 'cancel'
  | 'lock'
  | 'unlock'
  | 'undo'
  | 'reject'

export type StepRecordStatus =
  | 'draft'
  | 'hanging'
  | 'locked'
  | 'done'
  | 'canceled'
  | 'rejected'

export type StepRecord<StepName extends keyof Steps> = {
  id: string
  stepId: StepName

  previousId: string
  previousStepId: string
  previousUserId: string

  ancestorIds: string[]

  status: StepRecordStatus

  data: Partial<Steps[StepName]['data']>

  createdAt: Date
  createdBy: string

  updatedAt: Date
  updatedBy: string

  doneAt: Date
  doneBy: string

  hangedAt: Date
  hangedBy: string

  canceledAt: Date
  canceledBy: string

  lockedAt: Date
  lockedBy: string

  unlockedAt: Date
  unlockedBy: string

  undoAt: Date
  undoBy: string

  rejectedAt: Date
  rejectedBy: string

  /** doneAt - createdAt  */
  duration: number

  summary: Partial<Steps[StepName]['summary'] | Steps[StepName]['data']>
  note: string

  version: number
}
