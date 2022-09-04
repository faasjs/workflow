import { Steps } from '@faasjs/workflow-types'
import { Func, useFunc as originUseFunc } from '@faasjs/func'
import {
  useHttp as originUseHttp, HttpError, Http
} from '@faasjs/http'
import { useKnex as originUseKnex } from '@faasjs/knex'
import { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'
import { Status, Times } from './enum'
import { StepRecord, StepRecordAction } from './record'

type BaseContext<TName extends keyof Steps> = {
  record: Partial<StepRecord<Steps[TName]['params']>>

  data: Steps[TName]['params']

  trx: K.Transaction

  user?: User
}

type BaseActionParams<T> = {
  action: StepRecordAction

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

export type UseStepRecordFuncOptions<TName extends keyof Steps> = {
  stepId: TName

  summary?: (options: BaseContext<TName>) => Promise<string>

  draft?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['draft']>
  hang?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['hang']>
  done?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['done']>
  cancel?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['cancel']>
  lock?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['lock']>
  unlock?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['unlock']>
  undo?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['undo']>

  lang?: Partial<Lang>

  getUser?: (http: Http) => Promise<User>
  useFunc?: typeof originUseFunc
  useHttp?: typeof originUseHttp
  useKnex?: typeof originUseKnex
}

export function useStepRecordFunc<TName extends keyof Steps> (options: UseStepRecordFuncOptions<TName>) : Func {
  options.lang = !options.lang ? LangEn : {
    ...LangEn,
    ...options.lang,
  }

  if (!options.useFunc) options.useFunc = originUseFunc
  if (!options.useHttp) options.useHttp = originUseHttp
  if (!options.useKnex) options.useKnex = originUseKnex

  if (!options.stepId) throw Error(options.lang.stepIdRequired)

  return options.useFunc(function () {
    const http = options.useHttp<BaseActionParams<Steps[TName]['params']>>({
      validator: {
        params: {
          rules: {
            action: {
              required: true,
              in: [
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
    const knex = options.useKnex()

    return async function () {
      if (!http.params.id && !http.params.data)
        throw Error(options.lang.idOrDataRequired)

      const user = options.getUser ? await options.getUser(http) : null

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

        record.status = Status[http.params.action]

        record[Times[http.params.action]] = new Date()

        if (http.params.action === 'done' && record.createdAt)
          record.duration = new Date().getTime() - record.createdAt.getTime()

        let result

        if (options[http.params.action])
          result = await options[http.params.action]({
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
  })
}
