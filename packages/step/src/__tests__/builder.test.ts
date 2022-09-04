import { StepRecordAction } from '../record'
import { builder } from '../builder'
import { LangZh } from '../lang'
import { test } from '@faasjs/test'

const actions: StepRecordAction[] = [
  'draft',
  'hang',
  'done',
  'cancel',
  'lock',
  'unlock',
  'undo',
]

describe('builder', () => {
  it('should return hook', () => {
    expect(builder({})).toBeInstanceOf(Function)
  })

  it('should work with lang', () => {
    const hook = builder({ lang: { stepIdRequired: 'stepId is missing.' } })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => hook({})).toThrowError('stepId is missing.')
  })

  describe('should work with LangZh', () => {
    const func = test(builder({ lang: LangZh })({ stepId: 'stepId' }))

    it('without params', async () => {
      expect(await func.JSONhandler({})).toMatchObject({
        statusCode: 500,
        error: { message: '[params] 缺少 action' },
      })
    })

    it.each(actions)('with action %1', async (action) => {
      expect(await func.JSONhandler({ action })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] 缺少 id 或 data' },
      })
    })

    it('with unknown action', async () => {
      expect(await func.JSONhandler({ action: 'action' })).toMatchObject({
        statusCode: 500,
        error: { message: '[params] action 必须是 draft, hang, done, cancel, lock, unlock, undo 中的一个' },
      })
    })

    it('with unknown record', async () => {
      expect(await func.JSONhandler({
        action: 'done',
        id: 1,
      })).toMatchObject({
        statusCode: 500,
        error: { message: '找不到记录#1' },
      })
    })
  })
})
