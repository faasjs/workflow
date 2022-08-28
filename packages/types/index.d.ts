export type StepRecordAction = 'draft' | 'hang' | 'done' | 'cancel' | 'lock' | 'unlock'

export type StepRecordHandlerType = 'onDraft' | 'onHang' | 'onCancel' | 'onLock' | 'onUnlock'

export type StepRecordStatus = 'draft' | 'hanging' | 'locked' | 'done' | 'canceled'

import type { Steps } from './steps'

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
  unlockAt: Date

  /** doneAt - createdAt  */
  duration: number

  summary: string
  note: string
}

export type BaseActionParams<T> = {
  action: StepRecordAction

  stepId: string
  previousId?: string
  userId?: string

  note?: string

  unlockedAt?: number
} & ({
  id: string

  data?: T
} | {
  id?: string

  data: T
})

export type DraftStepRecordParams<T> = BaseActionParams<T> & {
  action: 'draft'
}

export type HangStepRecordParams<T> = BaseActionParams<T> & {
  action: 'hang'

  note: string
}

export type DoneStepRecordParams<T> = BaseActionParams<T> & {
  action: 'done'
}

export type CancelStepRecordParams<T = any> = BaseActionParams<T> & {
  action: 'cancel'

  note: string
}

export type LockStepRecordParams<T = any> = BaseActionParams<T> & {
  action: 'lock'
}

export type UnlockStepRecordParams<T = any> = BaseActionParams<T> & {
  action: 'unlock'
}

export type { Steps }
