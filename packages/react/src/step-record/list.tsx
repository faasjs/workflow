import { Table } from '@faasjs/ant-design'
import dayjs from 'dayjs'
import RelativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(RelativeTime)

export function StepRecordList (props: {
  stepId: string
}) {
  return <>
    <Table
      items={[
        { id: 'id' },
        { id: 'status' },
        {
          id: 'summary',
          render: (v: any) => JSON.stringify(v, null, 2),
        },
        { id: 'note' },
        {
          id: 'previousId',
          render: (_, v) => v.previous &&
            <a href={ `/steps/${v.previous.stepId}/${v.previousId}` }>{v.previousId} {v.previous.user?.name}</a>
        },
        {
          id: 'createdAt',
          type: 'time',
          render: (value: string) => <>{dayjs(value).fromNow()}</>
        }
      ]}
      faasData={{
        action: `steps/${props.stepId}`,
        params: { action: 'list' }
      }}
    />
  </>
}
