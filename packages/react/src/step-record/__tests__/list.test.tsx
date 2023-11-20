/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepRecordList } from '../list'
import { FaasReactClient } from '@faasjs/react'

describe('StepRecordList', () => {
  let originalFetch: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>

  beforeEach(() => {
    originalFetch = window.fetch
    window.fetch = jest.fn(async () => {
      return Promise.resolve({
        status: 200,
        headers: new Map([['Content-Type', 'application/json']]),
        text: async () =>
          JSON.stringify({
            data: {
              rows: [
                {
                  id: 'id',
                  status: 'draft',
                  summary: { key: 'value' },
                  createdAt: Date.now(),
                },
              ],
              pagination: {
                current: 1,
                pageSize: 10,
                total: 20,
              },
            },
          }),
      }) as unknown as Promise<Response>
    })
    FaasReactClient({ domain: 'test' })
  })

  afterEach(() => {
    window.fetch = originalFetch
  })

  it('should work', async () => {
    render(<StepRecordList stepId='stepId' />)

    expect(await screen.findByRole('table')).toHaveTextContent('"value"')
  })
})
