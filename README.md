# FaasJS/Workflow

[![Last commit](https://img.shields.io/github/last-commit/faasjs/workflow)](https://github.com/faasjs/workflow)
[![Unit Status](https://github.com/faasjs/workflow/actions/workflows/unit-test.yml/badge.svg)](https://github.com/faasjs/workflow/actions/workflows/unit-test.yml)
[![Coverage Status](https://img.shields.io/codecov/c/github/faasjs/workflow.svg)](https://app.codecov.io/gh/faasjs/workflow)

A Process Driven System base on FaasJS.

## Features

- [x] Process Driven.
- [x] Each process is a function.
- [x] Built with TypeScript and FaasJS.
- [x] Easy to use and test.

## Step examples

```ts
// newProduct.func.ts
import { Step } from '@faasjs/workflow-step'

declare module '@faasjs/workflow-types/steps' {
  interface Steps {
    newProduct: {
      params: {
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

export default useStep({
  stepId: 'newProduct',
  async onDone ({ createProduct, params }) {
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

## Contributing

Guidelines for contributing to FaasJS workflow can be found in [CONTRIBUTING.md](CONTRIBUTING.md).
