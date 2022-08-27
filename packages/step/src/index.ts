import { StepRecordAction } from '@faasjs/workflow-types'
import { Func, useFunc } from '@faasjs/func'
import { useHttp } from '@faasjs/http'
import { Knex, useKnex } from '@faasjs/knex'

export type BaseOptions<TData> = {
  id: string
  stepId: string

  data: TData

  summary: string
  updatedBy: string
  previousId?: string

  knex: Knex
}

export function useSetStepRecord<TData> ({ stepId, }: {
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
    useKnex()

    return async function () {
      if (!stepId) throw Error('stepId is required')

      if (!http.params.id && !http.params.data)
        throw Error('[params] id or data is required.')

      switch (http.params.action) {
        case 'draft':
        case 'done':
        case 'lock':
          if (!http.params.data) throw Error('[params] data is required.')
          break
        case 'hang':
          if (!http.params.note) throw Error('[params] note is required.')
          break
        case 'unlock':
        case 'cancel':
          if (!http.params.id) throw Error('[params] id is required.')
          if (!http.params.note) throw Error('[params] note is required.')
          break
        default:
          throw Error(`[params] Unknown action: ${http.params.action}`)
      }
    }
  })
}
