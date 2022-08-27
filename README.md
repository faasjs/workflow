# FaasJS/Workflow

A Process Driven System base on FaasJS.

## Step examples

```ts
// newProduct.func.ts
import { Step } from '@faasjs/workflow-step'

export type StepParams = {
  Input: {
    productName: string
    productPrice: number
    productQuantity: number
  }
  Output: {
    message: string
  }
}

declare module '@faasjs/workflow-types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Steps {
    newProduct: StepParams
  }
}

export default useStep<StepParams>({
  stepId: 'newProduct',
  async handler ({ createProduct, params }) {
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
