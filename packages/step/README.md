# @faasjs/workflow-step

[![License: MIT](https://img.shields.io/npm/l/@faasjs/workflow-step.svg)](https://github.com/faasjs/workflow/blob/main/packages/step/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/@faasjs/workflow-step/latest.svg)](https://www.npmjs.com/package/@faasjs/workflow-step)

The `Step` and `StepRecord` component in FaasJS/Workflow.

## Examples

```ts
// newProduct.func.ts
import { useStepRecordFunc } from '@faasjs/workflow-step'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    newProduct: {
      data: {
        productName: string
        productPrice: number
        productQuantity: number
      }
      done: {
        message: string
      }
    }
  }
}

export default useStepRecordFunc({
  stepId: 'newProduct',
  async done ({ createProduct, params }) {
    if(!params.productName) throw new Error('productName is required')
    if(!params.productPrice) throw new Error('productPrice is required')
    if(!params.productQuantity) throw new Error('productQuantity is required')

    await createProduct(params)

    return {
      message: 'Product created'
    }
  }
})
```

## Step's Status

### draft

When you initiate a new step, its status is `draft`. You can only modify the data of step in this status.

### hanging

Hanging means that the step is waiting for some reason to complete.

Deference between `hanging` and `draft` is that hanging means user knows the step is waiting for something, but draft means user doesn't know the step is waiting for something.

### locked

Locked means that the step is waiting for some reason to complete, and the step is locked, which means that the step cannot be modified.

If you want to modify the step, you need to unlock it first.

### done

Done means the step is completed. You can only read the data of step in this status.

### rejected

Rejected means that the step is rejected. You can only read the data of step in this status.

### canceled

Canceled means that the step is canceled.
