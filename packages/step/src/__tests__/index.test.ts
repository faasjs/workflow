import { useSetStepRecord } from '..'
import { test } from '@faasjs/test'
import { useKnex } from '@faasjs/knex'

describe('useSetStepRecord', () => {
  beforeAll(async () => {
    if (!process.env.SECRET_KNEX_CONNECTION)
      process.env.SECRET_KNEX_CONNECTION = `postgresql://testing@pg_testing${process.env.JEST_WORKER_ID}/testing`

    await useKnex({ config: { client: 'pg' } }).mount({ config: {} })
  })

  afterAll(async () => {
    await useKnex().quit()
  })

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
})
