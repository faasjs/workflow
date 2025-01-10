// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StepRecordDetail } from '../detail'

describe('StepRecordDetail', () => {
  it('should work', () => {
    render(<StepRecordDetail />)

    expect(screen.getByText('StepRecordDetail')).not.toBeNull()
  })
})
