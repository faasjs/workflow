import type{ Http } from '@faasjs/http'
import type { Knex } from '@faasjs/knex'
import { Steps } from '@faasjs/workflow-types'
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
