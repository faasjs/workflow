import { useStepRecordFunc } from '../hook'
import { test } from '@faasjs/test'
import { query } from '@faasjs/knex'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    basic: {
      params: {
        productName: string
      }
      onDraft: {
        productName: string
      }
    }
  }
}

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

    it.each([
      'draft',
      'hang',
      'done',
      'cancel',
      'lock',
      'unlock',
    ])('with action %1', async (action) => {
      expect(await func.JSONhandler({ action })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] id or data is required.' },
      })
    })

    it('with unknown action', async () => {
      expect(await func.JSONhandler({ action: 'action' })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] action must be in draft, hang, done, cancel, lock, unlock.' },
      })
    })
  })

  describe('draft', () => {
    it('should work without onDraft', async () => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        summary: async ({ data }) => `${data.productName}`
      }))

      expect(await func.JSONhandler({
        action: 'draft',
        data: { productName: 'name' },
      })).toMatchObject({ statusCode: 201 })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: 'draft',
        summary: 'name',
      })
    })

    it('should work with onDraft', async () => {
      const func = test(useStepRecordFunc({
        stepId: 'basic',
        summary: async ({ data }) => `${data.productName}`,
        async onDraft ({ data }) {
          data.productName = 'test'

          return { productName: data.productName }
        }
      }))

      expect(await func.JSONhandler({
        action: 'draft',
        data: { productName: 'name' },
      })).toMatchObject({
        statusCode: 200,
        data: { productName: 'test' },
      })

      const record = await query('step_records').first()

      expect(record).toMatchObject({
        status: 'draft',
        summary: 'test',
        data: { productName: 'test' }
      })
    })
  })
})
