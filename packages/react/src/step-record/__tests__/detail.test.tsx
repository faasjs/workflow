/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepRecordDetail } from '../detail'
import '@testing-library/jest-dom'

describe('StepRecordDetail', () => {
  it('should work', () => {
    render(<StepRecordDetail />)

    expect(screen.getByText('StepRecordDetail')).toBeInTheDocument()
  })
})
