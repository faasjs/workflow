import type { StepRecordAction, Steps } from '@faasjs/workflow-types'
import { type UseStepRecordFuncOptions, useStepRecordFunc } from './hook'
import { type InvokeStepOptions, invokeStep } from './invoke.js'

/**
 * Generate a custom step hook
 *
 * @example
 * ```ts
 * import { LangZh, buildHook } from '@faasjs/workflow-step'
 *
 * const useStepRecordFunc = buildHook({
 *   lang: LangZh,
 * })
 *
 * useStepRecordFunc({
 *   stepId: 'basic',
 *   async onDone() {},
 * })
 * ```
 */
export function buildHook<TExtend extends Record<string, any>>(
  builderOptions: Omit<
    UseStepRecordFuncOptions<any, TExtend>,
    StepRecordAction | 'stepId'
  >
) {
  return <TName extends keyof Steps>(
    options: UseStepRecordFuncOptions<TName, TExtend>
  ) => {
    if (options.lang && builderOptions.lang)
      options.lang = {
        ...builderOptions.lang,
        ...options.lang,
      }

    return useStepRecordFunc<TName, TExtend>({
      ...builderOptions,
      ...options,
    })
  }
}

export type BuildInvokeOptions<TExtend extends Record<string, any>> = Partial<
  Pick<InvokeStepOptions<any, TExtend>, 'basePath' | 'cf' | 'http'>
> & {
  beforeInvoke?: (options: InvokeStepOptions<any, TExtend>) => Promise<void>
}

/**
 * Generate a custom step invoker
 *
 * @example
 * ```ts
 * import { buildInvoke } from '@faasjs/workflow-step'
 *
 * const invokeStep = buildInvoke<{ uid: string }>({
 *   async beforeInvoke(options) {
 *     options.session = { user_id: options.uid }
 *   }
 * })
 *
 * await invokeStep({
 *  stepId: 'basic',
 *  action: 'draft',
 *  record: {
 *    data: { productName: 'name' }
 *  },
 *  uid: 'test',
 * })
 * ```
 */
export function buildInvoke<TExtend extends Record<string, any>>(
  options: BuildInvokeOptions<TExtend>
) {
  return async <TName extends keyof Steps>(
    props: InvokeStepOptions<TName, TExtend>
  ) => {
    if (options.beforeInvoke) await options.beforeInvoke(props)

    return invokeStep<TName, TExtend>({
      ...options,
      ...props,
    })
  }
}
