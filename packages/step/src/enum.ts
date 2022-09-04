import type { StepRecordAction, StepRecordStatus } from './record'

export const Status: Record<StepRecordAction, StepRecordStatus> = {
  draft: 'draft',
  hang: 'hanging',
  done: 'done',
  cancel: 'canceled',
  lock: 'locked',
  unlock: 'draft',
  undo: 'draft',
}

export const Times: Record<StepRecordAction, 'createdAt' | 'hangedAt' | 'doneAt' | 'canceledAt' | 'lockedAt' | 'unlockedAt' | 'undoAt'> = {
  draft: 'createdAt',
  hang: 'hangedAt',
  done: 'doneAt',
  cancel: 'canceledAt',
  lock: 'lockedAt',
  unlock: 'unlockedAt',
  undo: 'undoAt',
}
