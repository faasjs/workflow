/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepRecordDetail } from '../detail'

describe('StepRecordDetail', () => {
  it('should work', () => {
    render(<StepRecordDetail />)

    expect(screen.getByText('StepRecordDetail')).toBeInTheDocument()
  })
})
