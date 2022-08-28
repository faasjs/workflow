import type { useFunc } from '@faasjs/func'
import type{ useHttp } from '@faasjs/http'
import type { useKnex } from '@faasjs/knex'
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
  return <TData>(options: UseStepRecordFuncOptions<TData>) => {
    return useStepRecordFunc({
      ...builderOptions,
      ...options,
    })
  }
}
