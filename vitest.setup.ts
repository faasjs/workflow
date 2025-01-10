import { randomBytes } from 'node:crypto'
import { useKnex } from '@faasjs/knex'
import { useRedis } from '@faasjs/redis'
import Knex from 'knex'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { up } from './packages/step/src/migrate'

let init = false

beforeAll(async () => {
  if (init) return

  if (!process.env.KNEX_CONNECTION_BASE)
    process.env.KNEX_CONNECTION_BASE = 'postgresql://testing@pg_testing'

  const db = `testing_${process.env.VITEST_POOL_ID}`

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
  } catch (_e) {
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
    process.env.SECRET_REDIS_CONNECTION = `${process.env.REDIS_CONNECTION_BASE}/${process.env.VITEST_POOL_ID}`

  await useRedis().mount()

  init = true
})

afterAll(async () => {
  await useKnex().quit()
  await useRedis().quit()
})

beforeEach(async () => {
  await useKnex().raw(
    'TRUNCATE steps RESTART IDENTITY;TRUNCATE step_records RESTART IDENTITY;'
  )
  await useRedis().adapter.flushall()
})
