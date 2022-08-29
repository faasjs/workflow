import { StepRecordAction } from '.'

export interface Steps {
  [key: string]: {
    params: Record<string, any>
  } & Partial<Record<StepRecordAction, any>>
}
