import { useKnex } from '@faasjs/knex'
import Knex from 'knex'

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
    "undoAt" timestamp with time zone,

    duration numeric DEFAULT 0 not null,

    summary varchar,
    note varchar
);


DROP TABLE IF EXISTS steps;
CREATE TABLE steps (
    id varchar primary key,
    name varchar not null,
    enabled boolean not null default true,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);`)
  })

  global.afterAll(async () => {
    await knex.destroy()
    await useKnex().quit()
  })

  global.beforeEach(async () => {
    await knex.raw('TRUNCATE steps RESTART IDENTITY;TRUNCATE step_records RESTART IDENTITY;')
  })
}
