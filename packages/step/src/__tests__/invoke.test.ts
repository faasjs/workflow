import { Func } from '@faasjs/func'
import { Knex, query } from '@faasjs/knex'
import { invokeStep } from '../invoke'
import { Http } from '@faasjs/http'

describe('invokeStep', () => {
  it('work without previous', async () => {
    const result = await invokeStep({
      stepId: 'basic',
      action: 'draft',
      record: { data: { productName: 'name' } },
      session: { uid: 'test' },
      basePath: __dirname,
    })

    const record = await query('step_records').where({ id: result.id }).first()

    expect(record).toMatchObject({
      id: result.id,
      ancestorIds: [],
      stepId: 'basic',
      status: 'draft',
      summary: { productName: 'name' },
      data: { productName: 'name' },
      createdBy: 'test',
      updatedBy: 'test',
    })
  })

  it('work with previous', async () => {
    const result = await invokeStep({
      stepId: 'basic',
      action: 'draft',
      record: { data: { productName: 'name' } },
      previous: {
        id: 'previous',
        stepId: 'previous',
        ancestorIds: ['ancestor'],
        user: { id: 'previousUser' }
      },
      session: { uid: 'test' },
      basePath: __dirname,
    })

    const record = await query('step_records').where({ id: result.id }).first()

    expect(record).toMatchObject({
      id: result.id,
      ancestorIds: ['ancestor', 'previous'],
      stepId: 'basic',
      status: 'draft',
      summary: { productName: 'name' },
      data: { productName: 'name' },
      createdBy: 'test',
      updatedBy: 'test',
      previousId: 'previous',
      previousStepId: 'previous',
      previousUserId: 'previousUser',
    })
  })
})

describe('invokeStep with mono mode', () => {
  it('work without previous', async () => {
    process.env.FaasMode = 'mono'

    const knex = new Knex()
    const http = new Http()

    const func = new Func({
      plugins: [http, knex],
      async handler () {
        return await knex.transaction(async trx => {
          await trx('steps').insert({
            id: 'test',
            name: 'test',
          })
          return await invokeStep({
            stepId: 'basic',
            action: 'done',
            record: { data: { productName: 'name' } },
            session: { uid: 'test' },
            basePath: __dirname,
            trx,
          })
        })
      }
    })

    const response = await func.export().handler({}, { request_id: 'test' })

    expect(response.headers).toMatchObject({ 'X-FaasJS-Request-Id': 'test' })

    const record = await query('step_records').first()

    expect(record).toMatchObject({
      ancestorIds: [],
      stepId: 'basic',
      status: 'done',
      summary: { productName: 'name' },
      data: { productName: 'name' },
      createdBy: 'test',
      updatedBy: 'test',
    })

    const step = await query('steps').first()

    expect(step).toMatchObject({
      id: 'test',
      name: 'done',
    })

    process.env.FaasMode = undefined
  })
})
