import type {
  Steps, StepRecord, StepRecordAction, Step, User,
} from '@faasjs/workflow-types'
import { Func, useFunc } from '@faasjs/func'
import { useCloudFunction } from '@faasjs/cloud_function'
import {
  useHttp, HttpError, Http
} from '@faasjs/http'
import {
  Knex, query, useKnex
} from '@faasjs/knex'
import type { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'
import {
  Status, Times, Bys
} from './enum'
import {
  buildActions, BaseActionParams, BaseActionOptions,
} from './action'
import { randomUUID } from 'crypto'

export type BaseContext<TName extends keyof Steps, TExtend extends Record<string, any>> = {
  step: Step
  id: string
  action: StepRecordAction
  record: Partial<StepRecord<TName>>
  data: Steps[TName]['data']

  trx: K.Transaction

  user?: User

  lang: Lang
} & TExtend

export type ListPagination = {
  current: number
  pageSize: number
  total: number
}

export type UseStepRecordFuncOptions<TName extends keyof Steps, TExtend extends Record<string, any>> = {
  stepId: TName

  /**
   * `steps` as default
   */
  basePath?: string

  new?: (context: {
    stepId: TName
    knex: Knex
    user?: User
  }) => Promise<{
    step: Partial<Step>
  }>
  get?: (context: {
    id: string
    stepId: TName
    knex: Knex
    user?: User
  }) => Promise<{
    step: Partial<Step>
    users: User[]
    record: Partial<StepRecord<TName>>
  }>
  list?: (context: {
    stepId: TName
    knex: Knex
    user?: User
  }) => Promise<{
    step: Partial<Step>
    rows: Partial<StepRecord<TName>>[]
    pagination: ListPagination
  }>

  /** only be used with list action */
  pagination?: {
    current?: number
    pageSize?: number
  }

  /** use data as summary as default */
  summary?: (context: BaseContext<TName, TExtend>) => Promise<Steps[TName]['summary']>

  draft?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['draft']>
  hang?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['hang']>
  done?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['done']>
  cancel?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['cancel']>
  lock?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['lock']>
  unlock?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['unlock']>
  undo?: (options: BaseActionOptions<TName, TExtend>) => Promise<Steps[TName]['undo']>

  lang?: Partial<Lang>

  getUser?: (props: {
    http: Http
    knex: Knex
  }) => Promise<User>

  getUsers?: (props: {
    knex: Knex
    ids: string[]
  }) => Promise<User[]>

  /** uuid as default */
  generateId?: () => Promise<string>

  afterMount?: () => void
  /** run before draft, done, etc. */
  beforeAction?: (context: BaseContext<TName, TExtend>) => Promise<void>

  extends?: TExtend
}

export function useStepRecordFunc<TName extends keyof Steps, TExtend extends Record<string, any>> (
  options: UseStepRecordFuncOptions<TName, TExtend>
) : Func {
  options.lang = !options.lang ? LangEn : {
    ...LangEn,
    ...options.lang,
  }

  if (!options.stepId) throw Error(options.lang.stepIdRequired)

  if (options.afterMount)
    options.afterMount()

  return useFunc(function () {
    const cf = useCloudFunction()
    const http = useHttp<BaseActionParams<TName>>({
      validator: {
        params: {
          rules: {
            action: {
              required: true,
              in: [
                'new',
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
        case 'new':
          if (options.new)
            return options.new({
              stepId: options.stepId,
              knex,
              user,
            })

          return { step }
        case 'get': {
          if (!http.params.id)
            throw Error(options.lang.idRequired)

          if (options.get)
            return options.get({
              id: http.params.id,
              stepId: options.stepId,
              knex,
              user,
            })

          const record = await knex.query('step_records').where('id', http.params.id).first()

          const users = options.getUsers ? await options.getUsers({
            knex,
            ids: [
              record.createdBy,
              record.updatedBy,
              record.hangedBy,
              record.doneBy,
              record.canceledBy,
              record.lockedBy,
              record.unlockedBy,
              record.undoBy,
            ].filter(Boolean),
          }) : []

          return {
            step,
            users,
            record,
          }
        }
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
            step,
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
            let record: Partial<StepRecord<TName>>

            const saved = false
            const newRecord = !http.params.id

            if (http.params.id) {
              record = await trx('step_records').where('id', http.params.id).first()

              if (!record)
                throw Error(options.lang.recordNotFound(http.params.id))
            } else {
              record = {
                id: options.generateId ? await options.generateId() : randomUUID(),
                ancestorIds: [],
                stepId: options.stepId,
                summary: {},
                createdAt: new Date(),
              }
            }

            ([
              'data',
              'note',
              'doneBy',
              'hangedBy',
              'canceledBy',
              'lockedBy',
              'unlockedBy',
              'undoBy',
            ] as (keyof StepRecord<TName>)[]).forEach((k) => {
              if (http.params[k]) (record as any)[k] = http.params[k]
            })

            if (http.params.previousId) {
              record.previousId = http.params.previousId
              record.previousStepId = http.params.previousStepId
              record.previousUserId = http.params.previousUserId
              record.ancestorIds = http.params.ancestorIds
            }

            if (http.params.unlockedAt) record.unlockedAt = new Date(http.params.unlockedAt)

            if (options.beforeAction)
              await options.beforeAction({
                action: http.params.action as StepRecordAction,
                step,
                record,
                id: record.id,
                data: record.data,
                trx,
                user,
                lang: options.lang as Lang,
                ...options.extends,
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
              newRecord,
            })

            record.status = Status[http.params.action as StepRecordAction]

            record[Times[http.params.action as StepRecordAction]] = new Date()
            record[Bys[http.params.action as StepRecordAction]] = user ? user.id : null

            if (http.params.action === 'done' && record.createdAt)
              record.duration = new Date().getTime() - record.createdAt.getTime()

            let result: Record<string, any> = {}

            if (http.params.action === 'undo') {
              const nextRecord = await trx('step_records')
                .where('previousId', record.id)
                .select('id', 'stepId', 'status')
                .first()

              if (nextRecord?.status === 'done')
                throw Error(options.lang.undoFailed)

              if (nextRecord)
                await actions.updateRecord({
                  stepId: nextRecord.stepId,
                  id: nextRecord.id,
                  action: 'cancel',
                  note: options.lang.undoNote(record.id),
                })

              record.status = 'draft'
              record.undoAt = new Date()
              record.undoBy = user.id

              if (options.undo)
                result = await options.undo({
                  action: http.params.action as StepRecordAction,
                  step,
                  user,
                  lang: options.lang as Lang,
                  record,
                  id: record.id,
                  data: record.data,
                  trx,
                  ...actions,
                  ...options.extends,
                }) || {}

              if (!saved) await actions.save()

              return {
                ...(result || {}),
                id: record.id,
                message: options.lang.undoSuccess,
              }
            }

            if (options[http.params.action as StepRecordAction])
              result = await options[http.params.action as StepRecordAction]({
                action: http.params.action as StepRecordAction,
                step,
                user,
                lang: options.lang as Lang,
                record,
                id: record.id,
                data: record.data,
                trx,
                ...actions,
                ...options.extends,
              }) || {}

            if (!saved) await actions.save()

            if (!result.id) result.id = record.id

            return result
          })
        }
      }
    }
  })
}
