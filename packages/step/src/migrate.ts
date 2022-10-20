import { Knex } from 'knex'

export async function up (knex: Knex): Promise<void> {
  await knex.schema.createTable('steps', t => {
    t.string('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    t.timestamps(true, true, true)
    t.string('name')
    t.boolean('enabled').notNullable().defaultTo(true)
    t.string('createdBy')
    t.string('updatedBy')
    t.specificType('roles', '_varchar')
    t.specificType('actions', '_varchar')
  })

  await knex.schema.createTable('step_records', t => {
    t.string('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    t.timestamps(true, true, true)
    t.string('stepId').notNullable()
    t.string('previousId')
    t.string('previousStepId')
    t.string('previousUserId')
    t.specificType('ancestorIds', '_varchar')
    t.string('status').notNullable()
    t.jsonb('data').notNullable().defaultTo('{}')
    t.string('userId')
    t.string('createdBy')
    t.string('updatedBy')
    t.timestamp('doneAt')
    t.timestamp('hangedAt')
    t.timestamp('canceledAt')
    t.timestamp('lockedAt')
    t.timestamp('unlockedAt')
    t.timestamp('undoAt')
    t.integer('duration').notNullable().defaultTo(0)
    t.jsonb('summary').notNullable().defaultTo('{}')
    t.string('note')
  })
}

export async function down (knex: Knex): Promise<void> {
  await knex.schema.dropTable('steps')
  await knex.schema.dropTable('step_records')
}
