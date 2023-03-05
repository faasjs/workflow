import type {
  StepRecord, Step, User, StepRecordAction, Steps
} from '@faasjs/workflow-types'
import type { CloudFunction } from '@faasjs/cloud_function'
import type { Http } from '@faasjs/http'
import type { BaseContext, UseStepRecordFuncOptions } from './hook'
import type { Knex as K } from 'knex'
import { buildInvoke, BuildInvokeOptions } from './builder'

export type BaseActionParams<TName extends keyof Steps> = {
  action: StepRecordAction | 'new' | 'get' | 'list'
  /** only available in mono mode */
  trx?: K.Transaction
} & Partial<StepRecord<TName>>

export type BaseActionOptions<TName extends keyof Steps, TExtend = any> = BaseContext<TName, TExtend> & {
  save: () => Promise<StepRecord<TName>>
  cancel: (note: string) => Partial<StepRecord<TName>>
  createRecord<TName2 extends keyof Steps>(recordProps: {
    stepId: TName2
    action: StepRecordAction
  } & Partial<StepRecord<TName2>>): Promise<any>
  updateRecord<TName3 extends keyof Steps>(recordProps: {
    stepId: TName3
    action: StepRecordAction
    id: string
  } & Partial<StepRecord<TName3>>): Promise<any>
}

export function buildActions<TName extends keyof Steps> (props: {
  options: UseStepRecordFuncOptions<any, any>
  step: Partial<Step>
  record: Partial<StepRecord<TName>>
  user: User
  trx: K.Transaction
  saved: boolean
  cf: CloudFunction
  http: Http
  newRecord: boolean
  buildInvokeOptions?: BuildInvokeOptions<any>
}) {
  async function save () {
    if (props.options.summary)
      props.record.summary = await props.options.summary({
        step: props.step,
        user: props.user,
        record: props.record,
        id: props.record.id,
        data: props.record.data,
        trx: props.trx,
      })
    else
      props.record.summary = props.record.data

    props.record.updatedBy = props.user?.id

    if (!props.newRecord)
      props.record = Object.assign(props.record, await props.trx('step_records')
        .where('id', props.record.id)
        .update(props.record)
        .returning('*')
        .then(r => r[0]))
    else {
      props.record.createdBy = props.user?.id
      props.record = Object.assign(props.record, await props.trx('step_records')
        .insert(props.record)
        .returning('*')
        .then(r => r[0]))
    }
    props.saved = true
    props.newRecord = false

    return props.record as StepRecord<TName>
  }

  function cancel (note: string) {
    props.record.status = 'canceled'
    props.record.note = note
    props.record.canceledAt = new Date()
    props.record.canceledBy = props.user?.id

    return props.record
  }

  const invoke = buildInvoke({
    basePath: props.options.basePath,
    cf: props.cf,
    http: props.http,
    ...props.buildInvokeOptions || {},
  })

  const previous = {
    id: props.record.id,
    stepId: props.options.stepId,
    user: props.user,
    ancestorIds: [...(props.record.ancestorIds || []), props.record.id].filter(Boolean),
  }

  async function createRecord<TName extends keyof Steps>
  (recordProps: BaseActionParams<TName>) {
    if (!props.record.id && !props.saved)
      await save()
    return await invoke({
      stepId: recordProps.stepId,
      action: recordProps.action,
      record: recordProps,
      previous,
      user: props.user,
    })
  }

  async function updateRecord<TName extends keyof Steps>
  (recordProps: BaseActionParams<TName>) {
    return await invoke({
      stepId: recordProps.stepId,
      action: recordProps.action,
      record: recordProps,
      previous,
      user: props.user,
    })
  }

  return {
    save,
    createRecord,
    updateRecord,
    cancel,
  }
}
