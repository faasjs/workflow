import { query } from '@faasjs/knex'
import { invokeStep } from '../invoke'

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
