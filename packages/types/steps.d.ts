import { StepRecordAction } from '@faasjs/workflow-step'

export interface Steps {
  [key: string]: {
    data: Record<string, any>
  } & Partial<Record<StepRecordAction, any>>
}
