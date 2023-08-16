import { CloudFunction, useCloudFunction } from '@faasjs/cloud_function'
import { Http, useHttp } from '@faasjs/http'
import {
  Steps, StepRecordAction, StepRecord, User
} from '@faasjs/workflow-types'
import type { Knex } from 'knex'

export type InvokeStepOptions<TName extends keyof Steps, TExtend extends Record<string, any>> = {
  stepId: TName
  action: StepRecordAction
  record: Partial<StepRecord<TName>>
  previous?: {
    id: string
    stepId: string
    ancestorIds: string[]
    user?: User
  }
  user?: User
  /**
   * Request with session data
   * @default {}
   * @example { uid: 1 }
   */
  session?: Record<string, any>
  cf?: CloudFunction
  http?: Http
  /** only available in mono mode */
  trx?: Knex.Transaction
  /** @default steps */
  basePath?: string
} & TExtend

/**
 * Invoke a step
 *
 * ```ts
 * await invokeStep({
 *   stepId: 'basic',
 *   action: 'draft',
 *   record: {
 *     data: { productName: 'name' }
 *   },
 *   session: {
 *    uid: 'test'
 *   },
 * })
 * ```
 */
export async function invokeStep<TName extends keyof Steps, TExtend extends Record<string, any>> (
  props: InvokeStepOptions<TName, TExtend>
) {
  if (!props.cf) props.cf = await useCloudFunction().mount()
  if (!props.http) props.http = await useHttp().mount()

  const body: Record<string, any> = {
    action: props.action,
    ...props.record,
  }

  if (process.env.FaasMode === 'mono' && props.trx) body.trx = props.trx

  if (props.previous) {
    body.previousId = props.previous.id
    body.previousStepId = props.previous.stepId
    body.previousUserId = props.previous.user?.id
    body.ancestorIds = props.previous.ancestorIds.includes(props.previous.id) ?
      props.previous.ancestorIds : props.previous.ancestorIds.concat(props.previous.id).filter(Boolean)
  }

  const path = `${props.basePath || 'steps'}/${props.stepId}/index`

  const headers = {
    ...props.http.headers,
    cookie: props.http.session.config.key + '=' + props.http.session.encode(JSON.stringify(props.session || {}))
  }

  if (process.env.FaasMode === 'mono') {
    let file
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      file = require(path + '.func').default
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      file = require(path + '.func.ts').default
    }

    return await file.export().handler({
      headers,
      body,
    })
  }

  return await props.cf.invokeSync(path, {
    headers,
    body,
  }).then(res => {
    if (res.originBody) {
      const body = JSON.parse(res.originBody)
      return body.error ? Promise.reject(Error(body.error.message)) : body.data
    }
    return Promise.reject(res.body || res.statusCode)
  })
}
