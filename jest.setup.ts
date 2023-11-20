import { useKnex } from '@faasjs/knex'
import { useRedis } from '@faasjs/redis'
import Knex from 'knex'
import { randomBytes } from 'crypto'
import { up } from './packages/step/src/migrate'

if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom')
  global.React = require('react')

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
  let init = false

  global.beforeAll(async () => {
    if (init) return

    if (!process.env.KNEX_CONNECTION_BASE)
      process.env.KNEX_CONNECTION_BASE = 'postgresql://testing@pg_testing'

    const db = `testing_${process.env.JEST_WORKER_ID}`

    if (!process.env.SECRET_KNEX_CONNECTION)
      process.env.SECRET_KNEX_CONNECTION = `${process.env.KNEX_CONNECTION_BASE}/${db}`

    if (!process.env.SECRET_HTTP_COOKIE_SESSION_SECRET)
      process.env.SECRET_HTTP_COOKIE_SESSION_SECRET =
        randomBytes(32).toString('hex')

    const base = Knex({
      client: 'pg',
      connection: process.env.KNEX_CONNECTION_BASE,
    })

    try {
      await base.raw(`DROP DATABASE IF EXISTS ${db};`)
    } catch (error) {
      await base.raw(
        `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db}' AND pid <> pg_backend_pid();`
      )
    }

    await base.raw(`CREATE DATABASE ${db};`)
    await base.destroy()

    const sub = Knex({
      client: 'pg',
      connection: process.env.SECRET_KNEX_CONNECTION,
    })

    await sub.raw(`
DROP SCHEMA IF EXISTS public CASCADE;CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
`)

    await up(sub)

    await sub.destroy()

    await useKnex({ config: { client: 'pg' } }).mount()

    if (!process.env.REDIS_CONNECTION_BASE)
      process.env.REDIS_CONNECTION_BASE = 'redis://redis_testing'

    if (!process.env.SECRET_REDIS_CONNECTION)
      process.env.SECRET_REDIS_CONNECTION = `${process.env.REDIS_CONNECTION_BASE}/${process.env.JEST_WORKER_ID}`

    await useRedis().mount()

    init = true
  })

  global.afterAll(async () => {
    await useKnex().quit()
    await useRedis().quit()
  })

  global.beforeEach(async () => {
    await useKnex().raw(
      'TRUNCATE steps RESTART IDENTITY;TRUNCATE step_records RESTART IDENTITY;'
    )
  })
}
