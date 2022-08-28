import { StepRecordHandlerType } from '.'

export interface Steps {
  [key: string]: {
    params: Record<string, any>
  } & Partial<Record<StepRecordHandlerType, any>>
}
