export const LangEn = {
  stepIdRequired: 'stepId is required.',
  idOrDataRequired: '[params] id or data is required.',
  recordNotFound: (id: string) => `Record#${id} not found.`
}

export type Lang = typeof LangEn
