import type { useFunc } from '@faasjs/func'
import type{ useHttp } from '@faasjs/http'
import type { useKnex } from '@faasjs/knex'
import { Steps } from '@faasjs/workflow-types'
import { useStepRecordFunc, UseStepRecordFuncOptions } from './hook'
import type { Lang } from './lang'

export type BuilderOptions = {
  lang?: Partial<Lang>

  useFunc?: typeof useFunc
  useHttp?: typeof useHttp
  useKnex?: typeof useKnex
}

/**
 * Generate a custom base step builder
 */
export function builder (builderOptions: BuilderOptions) {
  return <TName extends keyof Steps>(options: UseStepRecordFuncOptions<TName>) => {
    if (options.lang && builderOptions.lang)
      options.lang = {
        ...builderOptions.lang,
        ...options.lang
      }

    return useStepRecordFunc({
      ...builderOptions,
      ...options,
    })
  }
}
