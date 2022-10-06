import type {
  StepRecord, Step, User, StepRecordAction, Steps
} from '@faasjs/workflow-types'
import type { CloudFunction } from '@faasjs/cloud_function'
import type { Http } from '@faasjs/http'
import type { BaseContext, UseStepRecordFuncOptions } from './hook'
import type { Knex as K } from 'knex'

export type BaseActionParams<T> = {
  action: StepRecordAction | 'new' | 'get' | 'list'

  stepId: string

  previousId?: string
  previousStepId?: string
  previousUserId?: string

  ancestorIds?: string[]

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

export type BaseActionOptions<TName extends keyof Steps, TExtend = any> = BaseContext<TName, TExtend> & {
  save: () => Promise<StepRecord>
  createRecord(props: BaseActionParams<any>): Promise<any>
}

export function buildActions (props: {
  options: UseStepRecordFuncOptions<any>
  step: Step
  record: Partial<StepRecord>
  user: User
  trx: K.Transaction
  saved: boolean
  cf: CloudFunction
  http: Http
}) {
  async function save () {
    if (props.options.summary)
      props.record.summary = await props.options.summary({
        step: props.step,
        user: props.user,
        record: props.record,
        data: props.record.data,
        trx: props.trx,
      })
    else
      props.record.summary = props.record.data

    props.record.updatedBy = props.user?.id

    if (props.record.id)
      props.record = Object.assign(props.record, await props.trx('step_records').where('id', props.record.id).update(props.record).returning('*').then(rows => rows[0]))
    else {
      props.record.createdBy = props.user?.id
      props.record = Object.assign(props.record, await props.trx('step_records').insert(props.record).returning('*').then(rows => rows[0]))
    }
    props.saved = true

    return props.record as StepRecord
  }

  async function createRecord (recordProps: BaseActionParams<any>) {
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

  return {
    save,
    createRecord
  }
}
