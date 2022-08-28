import { useSetStepRecord } from '..'
import { test } from '@faasjs/test'
import { query } from '@faasjs/knex'

describe('useSetStepRecord', () => {
  describe('should valid basic params', () => {
    const func = test(useSetStepRecord({
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
    it('should work', async () => {
      const func = test(useSetStepRecord<{
        productName: string
      }>({
        stepId: 'stepId',
        summary: async ({ record }) => `${record.data.productName}`
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
  })
})
