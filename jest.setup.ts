import { useKnex, raw } from '@faasjs/knex'

global.beforeAll(async () => {
  if (!process.env.SECRET_KNEX_CONNECTION)
    process.env.SECRET_KNEX_CONNECTION = `postgresql://testing@pg_testing${process.env.JEST_WORKER_ID}/testing`

  const knex = useKnex({ config: { client: 'pg' } })
  await knex.mount({ config: {} })

  await knex.raw('DROP SCHEMA IF EXISTS public CASCADE;CREATE SCHEMA public;')
  await knex.raw(`
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS step_records;
CREATE TABLE step_records (
    id SERIAL primary key,
    "stepId" varchar not null,

    "previousId" varchar,
    "ancestorIds" character varying[] DEFAULT '{}'::character varying[] not null,

    status varchar not null,

    data jsonb DEFAULT '{}'::jsonb not null,

    "userId" varchar,

    "createdAt" timestamp with time zone DEFAULT now(),
    "createdBy" varchar,

    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" varchar,

    "doneAt" timestamp with time zone,
    "hangedAt" timestamp with time zone,
    "canceledAt"  timestamp with time zone,
    "lockedAt" timestamp with time zone,
    "unlockedAt" timestamp with time zone,

    duration numeric DEFAULT 0 not null,

    summary varchar,
    note varchar
);`)
})

global.afterAll(async () => {
  await useKnex().quit()
})

global.beforeEach(async () => {
  await raw('TRUNCATE step_records RESTART IDENTITY;')
})
