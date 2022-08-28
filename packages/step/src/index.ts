import { StepRecord, StepRecordAction } from '@faasjs/workflow-types'
import { Func, useFunc } from '@faasjs/func'
import { useHttp } from '@faasjs/http'
import { useKnex } from '@faasjs/knex'
import { Knex } from 'knex'

export type BaseOptions<TData> = {
  record: Partial<StepRecord<TData>>

  trx: Knex.Transaction
}

export function useSetStepRecord<TData> ({
  stepId,
  summary,
}: {
  stepId: string

  summary?: (options: BaseOptions<TData>) => Promise<string>
}) : Func {
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
      if (!stepId) throw Error('stepId is required')

      if (!http.params.id && !http.params.data)
        throw Error('[params] id or data is required.')

      await knex.transaction(async trx => {
        let record: Partial<StepRecord>
        let saved = false
        if (http.params.id) {
          record = await trx('step_records').where({ id: http.params.id }).first()
          if (!record)
            throw Error(`Record#${http.params.id} not found.`)
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
