import { StepRecordAction } from './record'

export interface Steps {
  [key: string]: {
    data: Record<string, any>
    summary?: Record<string, any>
  } & Partial<Record<StepRecordAction, any>>
}
