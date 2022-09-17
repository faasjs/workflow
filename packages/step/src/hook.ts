import { Steps } from '@faasjs/workflow-types'
import { Func, useFunc } from '@faasjs/func'
import {
  useHttp, HttpError, Http
} from '@faasjs/http'
import { Knex, useKnex } from '@faasjs/knex'
import { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'
import { Status, Times } from './enum'
import { StepRecord, StepRecordAction } from './record'

type BaseContext<TName extends keyof Steps> = {
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

export function useStepRecordFunc<TName extends keyof Steps> (options: UseStepRecordFuncOptions<TName>) : Func {
  options.lang = !options.lang ? LangEn : {
    ...LangEn,
    ...options.lang,
  }

  if (!options.stepId) throw Error(options.lang.stepIdRequired)

  return useFunc(function () {
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

    return async function () {
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
            let saved = false
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
                record,
                data: record.data,
                trx,
                user,
              })

            const save = async function () {
              if (options.summary) record.summary = await options.summary({
                user,
                record,
                data: record.data,
                trx,
              })

              record.updatedBy = user?.id

              if (http.params.id)
                record = await trx('step_records').where({ id: http.params.id }).update(record).returning('*').then(rows => rows[0])
              else {
                record.createdBy = user?.id
                record = await trx('step_records').insert(record).returning('*').then(rows => rows[0])
              }
              saved = true

              return record as StepRecord
            }

            record.status = Status[http.params.action as StepRecordAction]

            record[Times[http.params.action as StepRecordAction]] = new Date()

            if (http.params.action === 'done' && record.createdAt)
              record.duration = new Date().getTime() - record.createdAt.getTime()

            let result

            if (options[http.params.action as StepRecordAction])
              result = await options[http.params.action as StepRecordAction]({
                user,
                record,
                data: record.data,
                trx,
                save,
              })

            if (!saved) await save()

            return result
          })
        }
      }
    }
  })
}
