// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StepRecordForm } from '../form'

describe('StepRecordForm', () => {
  it('should work', () => {
    render(<StepRecordForm />)

    expect(screen.getByText('StepRecordForm')).not.toBeNull()
  })
})
