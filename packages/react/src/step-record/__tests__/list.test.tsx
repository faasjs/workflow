/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepRecordList } from '../list'
import '@testing-library/jest-dom'

describe('StepRecordList', () => {
  it('should work', () => {
    render(<StepRecordList />)

    expect(screen.getByText('StepRecordList')).toBeInTheDocument()
  })
})
