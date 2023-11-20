import { useStepRecordFunc } from '../hook'
import { test } from '@faasjs/test'
import { query } from '@faasjs/knex'
import { Status, Times, Bys } from '../enum'
import type { StepRecordAction } from '@faasjs/workflow-types'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    basic: {
      data: {
        productName: string
      }
      summary: {
        name: string
      }
    }
  }
}

const actions: StepRecordAction[] = [
  'draft',
  'hang',
  'done',
  'cancel',
  'lock',
  'unlock',
  'undo',
]

describe('hook', () => {
  beforeEach(async () => {
    await query('steps').insert({
      id: 'stepId',
      name: 'name',
    })
    await query('steps').insert({
      id: 'basic',
      name: 'name',
    })
  })
  describe('should valid basic params', () => {
    const func = test(
      useStepRecordFunc({
        stepId: 'stepId',
        getUser: async () => Promise.resolve({ id: 'test' }),
      })
    )

    it('without params', async () => {
      expect(await func.JSONhandler({})).toMatchObject({
        statusCode: 500,
        error: { message: '[params] action is required.' },
      })
    })

    it.each(actions)('with action %1', async action => {
      expect(await func.JSONhandler({ action })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] id or data is required.' },
      })
    })

    it('with unknown action', async () => {
      expect(await func.JSONhandler({ action: 'action' })).toMatchObject({
        statusCode: 500,
        error: {
          message:
            '[params] action must be in get, list, draft, hang, done, cancel, lock, unlock, undo.',
        },
      })
    })

    it('with unknown record', async () => {
      expect(
        await func.JSONhandler({
          action: 'done',
          id: 1,
        })
      ).toMatchObject({
        statusCode: 500,
        error: { message: 'Record#1 not found.' },
      })
    })
  })

  describe('actions', () => {
    describe('new', () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
        })
      )

      it('should work', async () => {
        const { data } = await func.JSONhandler({ action: 'new' })
        expect(data).toMatchObject({
          step: {
            id: 'basic',
            name: 'name',
          },
        })
      })

      it('should work with handler', async () => {
        const func = test(
          useStepRecordFunc({
            stepId: 'basic',
            new: async () => ({ step: { id: 'id' } }),
          })
        )

        expect(await func.JSONhandler({ action: 'new' })).toMatchObject({
          statusCode: 200,
          data: { step: { id: 'id' } },
        })
      })
    })

    describe('get', () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          getUsers: async () => Promise.resolve([{ id: 'test' }]),
        })
      )

      it('should work with record', async () => {
        const record = await query('step_records')
          .insert({
            stepId: 'basic',
            status: 'draft',
          })
          .returning('*')
          .then(r => r[0])

        const { data } = await func.JSONhandler({
          action: 'get',
          id: record.id,
        })
        expect(data).toMatchObject({
          step: {
            id: 'basic',
            name: 'name',
          },
          users: [{ id: 'test' }],
          record: {
            id: record.id,
            status: 'draft',
            stepId: 'basic',
            data: {},
          },
        })
      })

      it('should work with handler', async () => {
        const func = test(
          useStepRecordFunc({
            stepId: 'basic',
            get: async () => ({
              step: { id: 'id' },
              users: [],
              record: {
                id: 'id',
                status: 'draft',
                data: {},
              },
            }),
          })
        )

        expect(
          await func.JSONhandler({
            action: 'get',
            id: 'id',
          })
        ).toMatchObject({
          statusCode: 200,
          data: {
            step: { id: 'id' },
            users: [],
            record: {
              id: 'id',
              status: 'draft',
              data: {},
            },
          },
        })
      })

      it('should fail without id', async () => {
        expect(await func.JSONhandler({ action: 'get' })).toMatchObject({
          statusCode: 500,
          error: { message: '[params] id is required.' },
        })
      })
    })

    describe('list', () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
        })
      )

      it('should work with record', async () => {
        const record = await query('step_records')
          .insert({
            stepId: 'basic',
            status: 'draft',
          })
          .returning('*')
          .then(r => r[0])

        expect(
          await func.JSONhandler({
            action: 'list',
            id: record.id,
          })
        ).toMatchObject({
          statusCode: 200,
          data: {
            step: {
              id: 'basic',
              name: 'name',
            },
            rows: [
              {
                id: record.id,
                status: 'draft',
                stepId: 'basic',
                data: {},
              },
            ],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 1,
            },
          },
        })
      })

      it('should work with handler', async () => {
        const func = test(
          useStepRecordFunc({
            stepId: 'basic',
            getUser: async () => Promise.resolve({ id: 'test' }),
            list: async () => ({
              step: { id: 'id' },
              rows: [
                {
                  id: 'id',
                  status: 'draft',
                  data: {},
                },
              ],
              pagination: {
                current: 1,
                pageSize: 10,
                total: 1,
              },
            }),
          })
        )

        expect(
          await func.JSONhandler({
            action: 'list',
            id: 'id',
          })
        ).toMatchObject({
          statusCode: 200,
          data: {
            step: { id: 'id' },
            rows: [
              {
                id: 'id',
                status: 'draft',
                data: {},
              },
            ],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 1,
            },
          },
        })
      })
    })

    it.each(actions)('%s should work without handler', async action => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          summary: async ({ data }) => ({ name: `${data.productName}` }),
        })
      )

      expect(
        await func.JSONhandler({
          action,
          data: { productName: 'name' },
        })
      ).toMatchObject({
        statusCode: 200,
        data: {},
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: Status[action],
        summary: { name: 'name' },
      })

      expect(record[Times[action]]).toBeDefined()
      expect(record[Bys[action]]).toEqual('test')
    })

    it.each(actions)('%s should work with handler', async action => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          [`${action}`]: async ({ data }) => {
            data.productName = 'test'

            return { productName: data.productName }
          },
        })
      )

      const { data } = await func.JSONhandler({
        action,
        data: { productName: 'name' },
      })

      const record = await query('step_records').first()

      expect(data).toMatchObject({
        id: record.id,
        productName: 'test',
      })

      expect(record).toMatchObject({
        status: Status[action],
        summary: { productName: 'test' },
        data: { productName: 'test' },
      })

      expect(record[Times[action]]).toBeDefined()
    })

    it.each(actions)(
      '%s should work with handler and extends',
      async action => {
        const func = test(
          useStepRecordFunc<'basic', { key: string }>({
            stepId: 'basic',
            getUser: async () => Promise.resolve({ id: 'test' }),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            [`${action}`]: async ({ data, key }) => {
              data.productName = 'test'

              return { productName: data[key] }
            },
            extends: { key: 'productName' },
          })
        )

        const { data } = await func.JSONhandler({
          action,
          data: { productName: 'name' },
        })

        const record = await query('step_records').first()

        expect(data).toMatchObject({
          id: record.id,
          productName: 'test',
        })

        expect(record).toMatchObject({
          status: Status[action],
          summary: { productName: 'test' },
          data: { productName: 'test' },
        })

        expect(record[Times[action]]).toBeDefined()
      }
    )

    it('undo', async () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          summary: async ({ data }) => ({ name: `${data.productName}` }),
        })
      )

      const { data } = await func.JSONhandler({
        action: 'done',
        data: { productName: 'name' },
      })

      expect(
        await func.JSONhandler({
          action: 'undo',
          id: data.id,
          note: 'note',
        })
      ).toMatchObject({
        statusCode: 200,
        data: {},
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: 'draft',
        summary: { name: 'name' },
      })

      expect(record.undoAt).toBeDefined()
      expect(record.undoBy).toEqual('test')
    })

    it('undo and cancel', async () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          summary: async ({ data }) => ({ name: `${data.productName}` }),
          undo: async ({ cancel }) => cancel('note'),
        })
      )

      const { data } = await func.JSONhandler({
        action: 'done',
        data: { productName: 'name' },
      })

      expect(
        await func.JSONhandler({
          action: 'undo',
          id: data.id,
          note: 'note',
        })
      ).toMatchObject({
        statusCode: 200,
        data: {},
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({ status: 'canceled' })

      expect(record.undoAt).toBeDefined()
      expect(record.undoBy).toEqual('test')
    })

    it('reject', async () => {
      const func = test(
        useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          summary: async ({ data }) => ({ name: `${data.productName}` }),
        })
      )

      await query('step_records').insert({
        id: 'id',
        stepId: 'basic',
        status: 'done',
      })

      expect(
        await func.JSONhandler({
          action: 'reject',
          note: 'note',
          previousId: 'id',
          data: {},
        })
      ).toMatchObject({
        statusCode: 200,
        data: {},
      })

      const records = await query('step_records').orderBy('createdAt', 'asc')

      expect(records[0]).toMatchObject({
        id: 'id',
        status: 'draft',
      })

      expect(records[1].rejectedAt).toBeDefined()
      expect(records[1].rejectedBy).toEqual('test')
    })

    it('beforeAction', async () => {
      const func = test(
        useStepRecordFunc<'basic', { extend: string }>({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          beforeAction: async () => ({ extend: 'extend' }),
          draft: async ({ extend }) => {
            return { productName: extend }
          },
          extends: { extend: 'test' },
        })
      )

      const { data } = await func.JSONhandler({
        action: 'draft',
        data: {},
      })

      expect(data).toMatchObject({ productName: 'extend' })
    })

    it('beforeAction with error', async () => {
      const func = test(
        useStepRecordFunc<'basic', { extend: string }>({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          async beforeAction() {
            throw Error('err')
          },
          draft: async ({ extend }) => {
            return { productName: extend }
          },
          extends: { extend: 'test' },
        })
      )

      const { error } = await func.JSONhandler({
        action: 'draft',
        data: {},
      })

      expect(error).toMatchObject({ message: 'err' })

      const count = await query('step_records').count()

      expect(count[0]).toEqual({ count: 0 })
    })

    it('work with lockKey and data', async () => {
      const handler = test(
        useStepRecordFunc({
          stepId: 'basic',
          lockKey: ({ data }) => data.productName,
        })
      ).JSONhandler

      await handler({
        action: 'draft',
        data: { productName: 'name' },
      })

      const { error } = await handler({
        action: 'draft',
        data: { productName: 'name' },
      })

      expect(error.message).toContain('Concurrent locked by key: name.')
    })

    it('work with lockKey and id', async () => {
      await query('step_records').insert({
        id: 'test',
        stepId: 'basic',
        status: 'draft',
        data: '{"productName":"productName"}',
      })
      const handler = test(
        useStepRecordFunc({
          stepId: 'basic',
          lockKey: ({ data }) => data.productName,
        })
      ).JSONhandler

      await handler({
        id: 'test',
        action: 'draft',
      })

      const { error } = await handler({
        id: 'test',
        action: 'draft',
      })

      expect(error.message).toContain('Concurrent locked by key: productName.')
    })
  })
})
