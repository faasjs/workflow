import { StepRecord, StepRecordAction } from '@faasjs/workflow-types'
import { Func, useFunc as originUseFunc } from '@faasjs/func'
import { useHttp as originUseHttp, } from '@faasjs/http'
import { useKnex as originUseKnex } from '@faasjs/knex'
import { Knex as K } from 'knex'
import { Lang, LangEn } from './lang'

export type BaseOptions<TData> = {
  record: Partial<StepRecord<TData>>

  trx: K.Transaction
}

export type UseStepRecordFuncOptions<TData> = {
  stepId: string

  summary?: (options: BaseOptions<TData>) => Promise<string>

  lang?: Partial<Lang>

  useFunc?: typeof originUseFunc
  useHttp?: typeof originUseHttp
  useKnex?: typeof originUseKnex
}

export function useStepRecordFunc<TData> ({
  stepId,
  summary,
  lang,
  useFunc,
  useHttp,
  useKnex,
}: UseStepRecordFuncOptions<TData>) : Func {
  lang = !lang ? LangEn : {
    ...LangEn,
    ...lang,
  }

  if (!useFunc) useFunc = originUseFunc
  if (!useHttp) useHttp = originUseHttp
  if (!useKnex) useKnex = originUseKnex

  if (!stepId) throw Error(lang.stepIdRequired)

  return useFunc(function () {
    const http = useHttp<{
      action: StepRecordAction
      id?: string
      data?: TData
      previousId?: string
      note?: string
      unlockAt?: number
    }>({
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

      await knex.transaction(async trx => {
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
            data: http.params.data
          }

        const save = async function () {
          if (summary) record.summary = await summary({
            record,
            trx,
          })
          if (http.params.id)
            await trx('step_records').where({ id: http.params.id }).update(record)
          else
            await trx('step_records').insert(record)
          saved = true
        }

        switch (http.params.action) {
          case 'draft':
            record.status = 'draft'
            if (!saved)
              await save()
            break
        }
      })
    }
  })
}
