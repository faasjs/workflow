export type StepRecordAction = 'draft' | 'hang' | 'done' | 'cancel' | 'lock' | 'unlock'

export type StepRecordStatus = 'pending' | 'hanging' | 'locked' | 'done' | 'canceled'

export type StepRecord<T = any> = {
  id: string

  stepId: string

  previousId: string
  ancestorIds: string[]

  status: StepRecordStatus

  data: T

  userId: string

  createdAt: Date
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

export type draftStepRecord<T = any> = {
  action: 'draft'

  stepId: string
  id?: string

  data: T
}

export type hangStepRecord<T = any> = {
  action: 'hang'

  stepId: string
  id?: string

  data?: T

  note: string
}

export type doneStepRecord<T = any> = {
  action: 'done'

  stepId: string
  id?: string

  data: T
}

export type cancelStepRecord<T = any> = {
  action: 'cancel'

  stepId: string
  id: string

  data?: T

  note: string
}

export type lockStepRecord<T = any> = {
  action: 'lock'

  stepId: string
  id?: string

  data?: T

  note?: string
}


export interface Steps {
  [key: string]: {
    Input: {
      [key: string]: any
    }
    Output: {
      [key: string]: any
    }
  }
}
