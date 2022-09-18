import { useStepRecordFunc } from '../hook'
import { test } from '@faasjs/test'
import { query } from '@faasjs/knex'
import { Status, Times } from '../enum'
import { StepRecordAction } from '../record'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    basic: {
      data: {
        productName: string
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
    const func = test(useStepRecordFunc({
      stepId: 'stepId',
      summary: async () => 'summary',
      getUser: async () => Promise.resolve({ id: 'test' }),
    }))

    it('without params', async () => {
      expect(await func.JSONhandler({})).toMatchObject({
        statusCode: 500,
        error: { message: '[params] action is required.' },
      })
    })

    it.each(actions)('with action %1', async (action) => {
      expect(await func.JSONhandler({ action })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] id or data is required.' },
      })
    })

    it('with unknown action', async () => {
      expect(await func.JSONhandler({ action: 'action' })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] action must be in get, list, draft, hang, done, cancel, lock, unlock, undo.' },
      })
    })

    it('with unknown record', async () => {
      expect(await func.JSONhandler({
        action: 'done',
        id: 1,
      })).toMatchObject({
        statusCode: 500,
        error: { message: 'Record#1 not found.' },
      })
    })
  })

  describe('actions', () => {
    describe('get', () => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        getUser: async () => Promise.resolve({ id: 'test' }),
      }))

      it('should work with record', async () => {
        const record = await query('step_records').insert({
          stepId: 'basic',
          status: 'draft',
        }).returning('*').then(r => r[0])

        const { data } = await func.JSONhandler({
          action: 'get',
          id: record.id,
        })
        expect(data).toMatchObject({
          step: {
            id: 'basic',
            name: 'name',
          },
          record: {
            id: record.id,
            status: 'draft',
            stepId: 'basic',
            data: {},
          },
        })
      })

      it('should work with handler', async () => {
        const func = test(useStepRecordFunc({
          stepId: 'basic',
          get: async () => ({
            id: 'id',
            status: 'draft',
            data: {}
          })
        }))

        expect(await func.JSONhandler({
          action: 'get',
          id: 'id',
        })).toMatchObject({
          statusCode: 200,
          data: {
            id: 'id',
            status: 'draft',
            data: {}
          }
        })
      })

      it('should fail without id', async () => {
        expect(await func.JSONhandler({ action: 'get' })).toMatchObject({
          statusCode: 500,
          error: { message: '[params] id is required.' }
        })
      })
    })

    describe('list', () => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        getUser: async () => Promise.resolve({ id: 'test' }),
      }))

      it('should work with record', async () => {
        const record = await query('step_records').insert({
          stepId: 'basic',
          status: 'draft',
        }).returning('*').then(r => r[0])

        expect(await func.JSONhandler({
          action: 'list',
          id: record.id,
        })).toMatchObject({
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
              }
            ],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 1,
            }
          }
        })
      })

      it('should work with handler', async () => {
        const func = test(useStepRecordFunc({
          stepId: 'basic',
          getUser: async () => Promise.resolve({ id: 'test' }),
          list: async () => ({
            rows: [
              {
                id: 'id',
                status: 'draft',
                data: {}
              }
            ],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 1,
            }
          })
        }))

        expect(await func.JSONhandler({
          action: 'list',
          id: 'id',
        })).toMatchObject({
          statusCode: 200,
          data: {
            rows: [
              {
                id: 'id',
                status: 'draft',
                data: {}
              }
            ],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 1,
            }
          }
        })
      })
    })

    it.each(actions)('%s should work without handler', async (action) => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        getUser: async () => Promise.resolve({ id: 'test' }),
        summary: async ({ data }) => `${data.productName}`
      }))

      expect(await func.JSONhandler({
        action,
        data: { productName: 'name' },
      })).toMatchObject({
        statusCode: 200,
        data: {}
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: Status[action],
        summary: 'name',
      })

      expect(record[Times[action]]).toBeDefined()
    })

    it.each(actions)('%s should work with handler', async (action) => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        getUser: async () => Promise.resolve({ id: 'test' }),
        summary: async ({ data }) => `${data.productName}`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        [`${action}`]: async ({ data }) => {
          data.productName = 'test'

          return { productName: data.productName, }
        }
      }))

      expect(await func.JSONhandler({
        action,
        data: { productName: 'name' },
      })).toMatchObject({
        statusCode: 200,
        data: { productName: 'test' },
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: Status[action],
        summary: 'test',
        data: { productName: 'test' }
      })

      expect(record[Times[action]]).toBeDefined()
    })
  })
})
