/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { StepRecordForm } from '../form'
import '@testing-library/jest-dom'

describe('StepRecordForm', () => {
  it('should work', () => {
    render(<StepRecordForm />)

    expect(screen.getByText('StepRecordForm')).toBeInTheDocument()
  })
})
