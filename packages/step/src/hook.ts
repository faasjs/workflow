import { Steps } from '@faasjs/workflow-types'
import { Func, useFunc } from '@faasjs/func'
import { CloudFunction, useCloudFunction } from '@faasjs/cloud_function'
import {
  useHttp, HttpError, Http
} from '@faasjs/http'
import {
  Knex, query, useKnex
} from '@faasjs/knex'
import { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'
import { Status, Times } from './enum'
import { StepRecord, StepRecordAction } from './record'
import { Step } from './step'

type BaseContext<TName extends keyof Steps> = {
  step: Step
  record: Partial<StepRecord<Steps[TName]['data']>>
  data: Steps[TName]['data']

  trx: K.Transaction

  user?: User
}

type BaseActionParams<T> = {
  action: StepRecordAction | 'get' | 'list'

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

type Save = () => Promise<StepRecord>

type BaseActionOptions<TName extends keyof Steps> = BaseContext<TName> & {
  save: Save
  createRecord(props: BaseActionParams<any>): Promise<any>
}

export type User = {
  id: string
} & {
  [key: string]: any
}

export type ListPagination = {
  current: number
  pageSize: number
  total: number
}

export type UseStepRecordFuncOptions<TName extends keyof Steps> = {
  stepId: TName

  /**
   * `steps` as default
   */
  basePath?: string

  get?: (context: {
    id: string
    stepId: TName
    knex: Knex
    user?: User
  }) => Promise<Partial<StepRecord>>
  list?: (context: {
    stepId: TName
    knex: Knex
    user?: User
  }) => Promise<{
    rows: Partial<StepRecord>[]
    pagination: ListPagination
  }>

  /** only be used with list action */
  pagination?: {
    current?: number
    pageSize?: number
  }

  summary?: (context: BaseContext<TName>) => Promise<string>

  draft?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['draft']>
  hang?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['hang']>
  done?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['done']>
  cancel?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['cancel']>
  lock?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['lock']>
  unlock?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['unlock']>
  undo?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['undo']>

  lang?: Partial<Lang>

  getUser?: (props: {
    http: Http
    knex: Knex
  }) => Promise<User>

  before?: (context: BaseContext<TName>) => Promise<void>
}

function buildActions (props: {
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
    if (props.options.summary) props.record.summary = await props.options.summary({
      step: props.step,
      user: props.user,
      record: props.record,
      data: props.record.data,
      trx: props.trx,
    })

    props.record.updatedBy = props.user.id

    if (props.record.id)
      props.record = await props.trx('step_records').where({ id: props.record.id }).update(props.record).returning('*').then(rows => rows[0])
    else {
      props.record.createdBy = props.user.id
      props.record = await props.trx('step_records').insert(props.record).returning('*').then(rows => rows[0])
    }
    props.saved = true

    return props.record as StepRecord
  }

  async function createRecord (recordProps: BaseActionParams<any>) {
    return await props.cf.invokeSync(`${props.options.basePath || 'steps'}/${recordProps.stepId}`, {
      headers: { cookie: props.http.session.config.key + '=' + props.http.session.encode(JSON.stringify({ aid: props.user.id })) },
      body: recordProps,
    })
  }

  return {
    save,
    createRecord
  }
}

export function useStepRecordFunc<TName extends keyof Steps> (options: UseStepRecordFuncOptions<TName>) : Func {
  options.lang = !options.lang ? LangEn : {
    ...LangEn,
    ...options.lang,
  }

  if (!options.stepId) throw Error(options.lang.stepIdRequired)

  return useFunc(function () {
    const cf = useCloudFunction()
    const http = useHttp<BaseActionParams<Steps[TName]['data']>>({
      validator: {
        params: {
          rules: {
            action: {
              required: true,
              in: [
                'get',
                'list',
                'draft',
                'hang',
                'done',
                'cancel',
                'lock',
                'unlock',
                'undo',
              ]
            }
          },
          onError (type, key) {
            switch (key) {
              case 'action':
                switch (type) {
                  case 'params.rule.required':
                    throw new HttpError({
                      statusCode: 500,
                      message: options.lang.actionRequired,
                    })
                  case 'params.rule.in':
                    throw new HttpError({
                      statusCode: 500,
                      message: options.lang.actionMustBeIn,
                    })
                }
            }
          },
        }
      }
    })
    const knex = useKnex()
    let step: Step

    return async function () {
      if (!step) step = await query('steps').where('id', options.stepId).first()

      const user = options.getUser ? await options.getUser({
        http,
        knex,
      }) : null

      switch (http.params.action) {
        case 'get':
          if (!http.params.id)
            throw Error(options.lang.idRequired)

          if (options.get)
            return options.get({
              id: http.params.id,
              stepId: options.stepId,
              knex,
              user,
            })

          return await knex.query('step_records').where({ id: http.params.id }).first()
        case 'list': {
          options.pagination = Object.assign({
            current: 1,
            pageSize: 10,
          }, options.pagination || {})

          if (options.list)
            return options.list({
              stepId: options.stepId,
              knex,
              user,
            })

          const rows = await knex.query('step_records')
            .where({ stepId: options.stepId })
            .orderBy('createdAt', 'desc')
            .limit(options.pagination.pageSize)
            .offset((options.pagination.current - 1) * options.pagination.pageSize)

          return {
            rows,
            pagination: {
              current: options.pagination.current,
              pageSize: options.pagination.pageSize,
              total: await knex.query('step_records').where({ stepId: options.stepId }).count().then(row => row[0].count),
            }
          }
        }
        default: {
          if (!http.params.id && !http.params.data)
            throw Error(options.lang.idOrDataRequired)

          return await knex.transaction(async trx => {
            let record: Partial<StepRecord>
            const saved = false
            if (http.params.id) {
              record = await trx('step_records').where({ id: http.params.id }).first()

              if (!record)
                throw Error(options.lang.recordNotFound(http.params.id))
            } else
              record = {
                stepId: options.stepId,
                summary: null,
                createdAt: new Date()
              }

            if (http.params.userId) record.userId = http.params.userId
            if (http.params.data) record.data = http.params.data
            if (http.params.note) record.note = http.params.note
            if (http.params.previousId) record.previousId = http.params.previousId
            if (http.params.unlockedAt) record.unlockedAt = new Date(http.params.unlockedAt)

            if (options.before)
              await options.before({
                step,
                record,
                data: record.data,
                trx,
                user,
              })

            const actions = buildActions({
              options,
              step,
              record,
              user,
              trx,
              saved,
              cf,
              http,
            })

            record.status = Status[http.params.action as StepRecordAction]

            record[Times[http.params.action as StepRecordAction]] = new Date()

            if (http.params.action === 'done' && record.createdAt)
              record.duration = new Date().getTime() - record.createdAt.getTime()

            let result

            if (options[http.params.action as StepRecordAction])
              result = await options[http.params.action as StepRecordAction]({
                step,
                user,
                record,
                data: record.data,
                trx,
                save: actions.save,
                createRecord: actions.createRecord,
              })

            if (!saved) await actions.save()

            return result
          })
        }
      }
    }
  })
}
