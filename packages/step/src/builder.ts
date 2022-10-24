import type { Steps, StepRecordAction } from '@faasjs/workflow-types'
import { useStepRecordFunc, UseStepRecordFuncOptions } from './hook'

/**
 * Generate a custom step builder
 * ```ts
 * import { LangZh } from '@faasjs/workflow-step'
 *
 * const build = builder({
 *   lang: LangZh,
 * })
 * ```
 */
export function builder<TExtend extends Record<string, any>> (
  builderOptions: Omit<UseStepRecordFuncOptions<any, TExtend>, StepRecordAction | 'stepId'>
) {
  return <TName extends keyof Steps>(options: UseStepRecordFuncOptions<TName, TExtend>) => {
    if (options.lang && builderOptions.lang)
      options.lang = {
        ...builderOptions.lang,
        ...options.lang
      }

    return useStepRecordFunc<TName, TExtend>({
      ...builderOptions,
      ...options,
    })
  }
}
