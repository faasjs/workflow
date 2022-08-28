import { builder } from '../builder'

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
})
