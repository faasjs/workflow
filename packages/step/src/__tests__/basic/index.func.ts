import { useStepRecordFunc } from '../../hook'

export default useStepRecordFunc({
  stepId: 'basic',
  async getUser ({ http }) {
    return { id: http.session.read('uid') as string }
  }
})
