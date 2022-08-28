export type Lang = {
  stepIdRequired: string
  idOrDataRequired: string
  recordNotFound: (id: string) => string
}

export const LangEn: Lang = {
  stepIdRequired: 'stepId is required.',
  idOrDataRequired: '[params] id or data is required.',
  recordNotFound: (id) => `Record#${id} not found.`
}
