import type{ Http } from '@faasjs/http'
import type { Knex } from '@faasjs/knex'
import type { Steps } from '@faasjs/workflow-types'
import {
  User, useStepRecordFunc, UseStepRecordFuncOptions
} from './hook'
import type { Lang } from './lang'

export type BuilderOptions = {
  lang?: Partial<Lang>
  getUser?: (props: {
    http: Http
    knex: Knex
  }) => Promise<User>
  basePath?: string
  extends?: any
}

/**
 * Generate a custom base step builder
 */
export function builder<TExtend = any> (builderOptions: BuilderOptions) {
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
