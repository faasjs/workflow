import { useKnex } from '@faasjs/knex'
import Knex from 'knex'
import { up } from './packages/step/src/migrate'

if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom')
  global.React = require('react')

  // eslint-disable-next-line no-undef
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
} else {
  let knex: any

  global.beforeAll(async () => {
    if (!process.env.SECRET_KNEX_CONNECTION)
      process.env.SECRET_KNEX_CONNECTION = `postgresql://testing@pg_testing${process.env.JEST_WORKER_ID}/testing`

    await useKnex({ config: { client: 'pg' } }).mount({ config: {} })

    knex = Knex({
      client: 'pg',
      connection: process.env.SECRET_KNEX_CONNECTION,
    })
    await knex.raw('DROP SCHEMA IF EXISTS public CASCADE;CREATE SCHEMA public;')
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    await up(knex)
  })

  global.afterAll(async () => {
    await knex.destroy()
    await useKnex().quit()
  })

  global.beforeEach(async () => {
    await knex.raw('TRUNCATE steps RESTART IDENTITY;TRUNCATE step_records RESTART IDENTITY;')
  })
}
