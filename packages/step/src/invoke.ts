import { CloudFunction, useCloudFunction } from '@faasjs/cloud_function'
import { Http, useHttp } from '@faasjs/http'
import {
  Steps, StepRecordAction, StepRecord, User
} from '@faasjs/workflow-types'

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
  /**
   * Request with session data
   * @default {}
   * @example { uid: 1 }
   */
  session?: Record<string, any>
  cf?: CloudFunction
  http?: Http
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
export async function invokeStep<TName extends keyof Steps, TExtend extends Record<string, any>> (props: InvokeStepOptions<TName, TExtend>) {
  if (!props.http) props.http = await useHttp().mount()
  if (!props.cf) props.cf = await useCloudFunction().mount()

  return await props.cf.invokeSync(`${props.basePath || 'steps'}/${props.stepId}/index`, {
    headers: { cookie: props.http.session.config.key + '=' + props.http.session.encode(JSON.stringify(props.session || {})) },
    body: {
      action: props.action,
      ...props.record,
      previousId: props.previous?.id,
      previousStepId: props.previous?.stepId,
      previousUserId: props.previous?.user?.id,
      ancestorIds: props.previous?.ancestorIds.concat(props.previous.id).filter(Boolean) || []
    },
  }).then(res => {
    if (res.originBody) {
      const body = JSON.parse(res.originBody)
      return body.error ? Promise.reject(Error(body.error.message)) : body.data
    }
    return Promise.reject(res.body || res.statusCode)
  })
}
