import { CloudFunction } from '@faasjs/cloud_function'
import { Http } from '@faasjs/http'
import { transaction } from '@faasjs/knex'
import { buildActions } from '../action'

describe('action', () => {
  it('should work', async () => {
    const cf = new CloudFunction()
    const http = new Http()

    cf.invokeSync = async function invokeSync (name: string, data: any): Promise<any> {
      return Promise.resolve({
        originBody: JSON.stringify({
          data: {
            name,
            data
          }
        })
      })
    }

    await transaction(async trx => {
      const actions = buildActions({
        options: { stepId: 'basic', },
        step: {
          id: 'basic',
          name: 'basic',
          enabled: true,
          roles: [],
          actions: [],
        },
        record: {
          id: 'id',
          ancestorIds: [],
        },
        newRecord: false,
        user: { id: 'test' },
        trx,
        saved: false,
        cf,
        http,
      })

      expect(actions).toMatchObject({
        save: expect.any(Function),
        createRecord: expect.any(Function),
      })

      const save = await actions.save()

      expect(save).toEqual({
        id: 'id',
        ancestorIds: [],
        summary: undefined,
        updatedBy: 'test',
      })

      const result = await actions.createRecord({
        stepId: 'basic',
        action: 'draft',
        data: {},
      })

      expect(result.data.body).toEqual({
        action: 'draft',
        data: {},
        ancestorIds: ['id'],
        previousId: 'id',
        previousStepId: 'basic',
        previousUserId: 'test',
        stepId: 'basic',
      })
    })
  })
})
