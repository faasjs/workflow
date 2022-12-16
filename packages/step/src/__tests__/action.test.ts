import { useCloudFunction } from '@faasjs/cloud_function'
import { useHttp } from '@faasjs/http'
import { query, transaction } from '@faasjs/knex'
import { buildActions } from '../action'

describe('action', () => {
  it('should work', async () => {
    const cf = useCloudFunction()
    const http = await useHttp().mount()

    // cf.invokeSync = async function invokeSync (name: string, data: any): Promise<any> {
    //   return Promise.resolve({
    //     originBody: JSON.stringify({
    //       data: {
    //         name,
    //         data
    //       }
    //     })
    //   })
    // }

    await transaction(async trx => {
      const actions = buildActions({
        options: {
          stepId: 'basic',
          basePath: __dirname,
        },
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
        buildInvokeOptions: {
          async beforeInvoke (props) {
            props.session = { uid: props.user.id }
          }
        }
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

      const record = await query('step_records').where('id', result.id).first()

      expect(record).toMatchObject({
        status: 'draft',
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
