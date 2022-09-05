export const LangEn = {
  stepIdRequired: 'stepId is required.',
  idRequired: '[params] id is required.',
  idOrDataRequired: '[params] id or data is required.',
  recordNotFound: (id: string) => `Record#${id} not found.`,
  actionRequired: '[params] action is required.',
  actionMustBeIn: '[params] action must be in get, list, draft, hang, done, cancel, lock, unlock, undo.'
}

export const LangZh = {
  stepIdRequired: '缺少 stepId',
  idRequired: '[params] 缺少 id',
  idOrDataRequired: '[params] 缺少 id 或 data',
  recordNotFound: (id: string) => `找不到记录#${id}`,
  actionRequired: '[params] 缺少 action',
  actionMustBeIn: '[params] action 必须是 get, list, draft, hang, done, cancel, lock, unlock, undo 中的一个'
}

export type Lang = typeof LangEn
