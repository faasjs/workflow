import { useStepRecordFunc } from '../hook'
import { test } from '@faasjs/test'
import { query } from '@faasjs/knex'
import { Status, Times } from '../enum'
import { StepRecordAction } from '../record'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    basic: {
      params: {
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
  describe('should valid basic params', () => {
    const func = test(useStepRecordFunc({
      stepId: 'stepId',
      summary: async () => 'summary'
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
        error: { message: '[params] action must be in draft, hang, done, cancel, lock, unlock, undo.' },
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
    it.each(actions)('%s should work without handler', async (action) => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        summary: async ({ data }) => `${data.productName}`
      }))

      expect(await func.JSONhandler({
        action,
        data: { productName: 'name' },
      })).toMatchObject({ statusCode: 201 })

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
