import type { Steps } from './steps'

export type StepRecordAction = 'draft' | 'hang' | 'done' | 'cancel' | 'lock' | 'unlock' | 'undo'

export type StepRecordStatus = 'draft' | 'hanging' | 'locked' | 'done' | 'canceled'

export type StepRecord<StepName extends keyof Steps> = {
  id: string
  stepId: StepName

  previousId: string
  previousStepId: string
  previousUserId: string

  ancestorIds: string[]

  status: StepRecordStatus

  data: Steps[StepName]['data']

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

  /** doneAt - createdAt  */
  duration: number

  summary: Steps[StepName]['summary']
  note: string
}
