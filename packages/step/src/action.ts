import type {
  StepRecord, Step, User, StepRecordAction, Steps
} from '@faasjs/workflow-types'
import { CloudFunction } from '@faasjs/cloud_function'
import { Http } from '@faasjs/http'
import type { BaseContext, UseStepRecordFuncOptions } from './hook'
import type { Knex as K } from 'knex'

export type BaseActionParams<TName extends keyof Steps> = {
  action: StepRecordAction | 'new' | 'get' | 'list'
} & Partial<StepRecord<TName>>

export type BaseActionOptions<TName extends keyof Steps, TExtend = any> = BaseContext<TName, TExtend> & {
  save: () => Promise<StepRecord<TName>>
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

  async function createRecord<TName extends keyof Steps>
  (recordProps: BaseActionParams<TName>) {
    if (!props.record.id && !props.saved)
      await save()
    return await props.cf.invokeSync(`${props.options.basePath || 'steps'}/${recordProps.stepId}/index`, {
      headers: { cookie: props.http.session.config.key + '=' + props.http.session.encode(JSON.stringify({ aid: props.user?.id })) },
      body: {
        ...recordProps,
        previousId: props.record.id,
        previousStepId: props.options.stepId,
        previousUserId: props.user?.id,
        ancestorIds: props.record.ancestorIds.concat(props.record.id)
      },
    }).then(res => {
      if (res.originBody) {
        const body = JSON.parse(res.originBody)
        return body.error ? Promise.reject(Error(body.error.message)) : body.data
      }
      return Promise.reject(res.body || res.statusCode)
    })
  }

  async function updateRecord<TName extends keyof Steps>
  (recordProps: BaseActionParams<TName>) {
    return await props.cf.invokeSync(`${props.options.basePath || 'steps'}/${recordProps.stepId}/index`, {
      headers: { cookie: props.http.session.config.key + '=' + props.http.session.encode(JSON.stringify({ aid: props.user?.id })) },
      body: {
        ...recordProps,
        previousId: props.record.id,
        previousStepId: props.options.stepId,
        previousUserId: props.user?.id,
        ancestorIds: props.record.ancestorIds.concat(props.record.id)
      },
    }).then(res => {
      if (res.originBody) {
        const body = JSON.parse(res.originBody)
        return body.error ? Promise.reject(Error(body.error.message)) : body.data
      }
      return Promise.reject(res.body || res.statusCode)
    })
  }

  return {
    save,
    createRecord,
    updateRecord,
  }
}
