import { Knex } from 'knex'

export function base (k: any, t: any, tableName: string) {
  t.string('id').notNullable().defaultTo(k.raw('uuid_generate_v4()')).primary()
  t.timestamp('createdAt').notNullable().defaultTo(k.fn.now())
  t.timestamp('updatedAt').notNullable().defaultTo(k.fn.now())
  k.raw(`CREATE OR REPLACE FUNCTION update_timestamp()
  RETURNS TRIGGER AS $$
  BEGIN
        NEW.updatedAt = now();
        RETURN NEW;
  END;`)
  k.raw(`CREATE TRIGGER ${tableName}_timestamp BEFORE UPDATE ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE update_timestamp();`)
}

export function baseWithBy (k: any, t: any, tableName: string) {
  base(k, t, tableName)
  t.string('createdBy')
  t.string('updatedBy')
}

export async function up (knex: Knex): Promise<void> {
  await knex.schema.createTable('steps', t => {
    baseWithBy(knex, t, 'steps')
    t.string('name')
    t.boolean('enabled').notNullable().defaultTo(true)
    t.specificType('roles', '_varchar').notNullable().defaultTo('{}')
    t.specificType('actions', '_varchar').notNullable().defaultTo('{}')
  })

  await knex.schema.createTable('step_records', t => {
    baseWithBy(knex, t, 'step_records')
    t.string('stepId').notNullable()
    t.string('previousId')
    t.string('previousStepId')
    t.string('previousUserId')
    t.specificType('ancestorIds', '_varchar').notNullable().defaultTo('{}')
    t.string('status').notNullable()
    t.jsonb('data').notNullable().defaultTo('{}')
    t.timestamp('doneAt')
    t.string('doneBy')
    t.timestamp('hangedAt')
    t.string('hangedBy')
    t.timestamp('canceledAt')
    t.string('canceledBy')
    t.timestamp('lockedAt')
    t.string('lockedBy')
    t.timestamp('unlockedAt')
    t.string('unlockedBy')
    t.timestamp('undoAt')
    t.string('undoBy')
    t.integer('duration').notNullable().defaultTo(0)
    t.jsonb('summary').notNullable().defaultTo('{}')
    t.string('note')
  })
}

export async function down (knex: Knex): Promise<void> {
  await knex.schema.dropTable('steps')
  await knex.schema.dropTable('step_records')
}
