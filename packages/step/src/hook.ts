import {
  BaseActionParams, StepRecord, Steps
} from '@faasjs/workflow-types'
import { Func, useFunc as originUseFunc } from '@faasjs/func'
import { useHttp as originUseHttp, } from '@faasjs/http'
import { useKnex as originUseKnex } from '@faasjs/knex'
import { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'

type BaseOptions<TName extends keyof Steps> = {
  record: Partial<StepRecord<Steps[TName]['params']>>

  data: Steps[TName]['params']

  trx: K.Transaction
}

type Save = () => Promise<StepRecord>

type BaseActionOptions<TName extends keyof Steps> = BaseOptions<TName> & {
  save: Save
}

export type UseStepRecordFuncOptions<TName extends keyof Steps> = {
  stepId: TName

  summary?: (options: BaseOptions<TName>) => Promise<string>
  onDraft?: (options: BaseActionOptions<TName>) => Promise<Steps[TName]['onDraft']>

  lang?: Partial<Lang>

  useFunc?: typeof originUseFunc
  useHttp?: typeof originUseHttp
  useKnex?: typeof originUseKnex
}

export function useStepRecordFunc<TName extends keyof Steps> ({
  stepId,
  summary,
  lang,
  useFunc,
  useHttp,
  useKnex,

  onDraft,
}: UseStepRecordFuncOptions<TName>) : Func {
  lang = !lang ? LangEn : {
    ...LangEn,
    ...lang,
  }

  if (!useFunc) useFunc = originUseFunc
  if (!useHttp) useHttp = originUseHttp
  if (!useKnex) useKnex = originUseKnex

  if (!stepId) throw Error(lang.stepIdRequired)

  return useFunc(function () {
    const http = useHttp<BaseActionParams<Steps[TName]['params']>>({
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
              ]
            }
          }
        }
      }
    })
    const knex = useKnex()

    return async function () {
      if (!http.params.id && !http.params.data)
        throw Error(lang.idOrDataRequired)

      return await knex.transaction(async trx => {
        let record: Partial<StepRecord>
        let saved = false
        if (http.params.id) {
          record = await trx('step_records').where({ id: http.params.id }).first()

          if (!record)
            throw Error(lang.recordNotFound(http.params.id))
        } else
          record = {
            stepId,
            summary: null,
          }

        if (http.params.userId) record.userId = http.params.userId
        if (http.params.data) record.data = http.params.data
        if (http.params.note) record.note = http.params.note
        if (http.params.previousId) record.previousId = http.params.previousId
        if (http.params.unlockedAt) record.unlockAt = new Date(http.params.unlockedAt)

        const save = async function () {
          if (summary) record.summary = await summary({
            record,
            data: record.data,
            trx,
          })
          if (http.params.id)
            record = await trx('step_records').where({ id: http.params.id }).update(record).returning('*').then(rows => rows[0])
          else
            record = await trx('step_records').insert(record).returning('*').then(rows => rows[0])
          saved = true

          return record as StepRecord
        }

        switch (http.params.action) {
          case 'draft': {
            record.status = 'draft'

            let result: Steps[TName]['onDraft']

            if (onDraft)
              result = await onDraft({
                record,
                data: record.data,
                trx,
                save,
              })

            if (!saved) await save()

            return result
          }
        }
      })
    }
  })
}
