// @vitest-environment happy-dom

import { setMock } from '@faasjs/browser'
import { FaasReactClient } from '@faasjs/react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { StepRecordList } from '../list'

describe('StepRecordList', () => {
  beforeEach(() => {
    setMock(async () => ({
      status: 200,
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
    }))
    FaasReactClient({ baseUrl: 'test/' })
  })

  it('should work', async () => {
    render(<StepRecordList stepId='stepId' />)

    expect((await screen.findByRole('table')).textContent).toContain('"key": "value"')
  })
})
