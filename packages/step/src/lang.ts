export const LangEn = {
  stepIdRequired: 'stepId is required.',
  idRequired: '[params] id is required.',
  idOrDataRequired: '[params] id or data is required.',
  recordNotFound: (id: string) => `Record#${id} not found.`,
  actionRequired: '[params] action is required.',
  actionMustBeIn: '[params] action must be in get, list, draft, hang, done, cancel, lock, unlock, undo.',
  undoNote: (id: string) => `Previously undo by ${id}`,
  undoSuccess: 'Undo record.',
  undoFailed: 'Undo failed, next record has be done.',
  locked: (key: string) => `Concurrent locked by key: ${key}.`,
  rejectSuccess: 'Rejected.',
}

export const LangZh = {
  stepIdRequired: '缺少 stepId',
  idRequired: '[params] 缺少 id',
  idOrDataRequired: '[params] 缺少 id 或 data',
  recordNotFound: (id: string) => `找不到记录#${id}`,
  actionRequired: '[params] 缺少 action',
  actionMustBeIn: '[params] action 必须是 get, list, draft, hang, done, cancel, lock, unlock, undo 中的一个',
  undoNote: (id: string) => `上游工单撤销 ${id}`,
  undoSuccess: '已撤回工单',
  undoFailed: '撤回工单失败，下游工单已完成',
  locked: (key: string) => `工单并发已锁定#${key}`,
  rejectSuccess: '驳回成功',
}

export type Lang = typeof LangEn
