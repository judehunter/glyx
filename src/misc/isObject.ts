export const isActualObject = (value: any) =>
  typeof value === 'object' && !Array.isArray(value) && value !== null

export type IsActualObject<T> = T extends object
  ? T extends any[]
    ? false
    : T extends Function
    ? false
    : true
  : false
