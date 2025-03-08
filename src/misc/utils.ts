export const attachObjToFn = <
  TFn extends (...args: any[]) => any,
  TObj extends Record<string, any>,
>(
  fn: TFn,
  obj: TObj,
) => {
  return Object.assign(fn, obj) as TFn & TObj
}

export const uniqueDeps = (a: string[], b: string[]) => {
  return [...new Set([...a, ...b])]
}

export const identity = <T>(x: T) => x

export const makeKey = (groupKey: string | undefined, key: string) => {
  return groupKey ? `${groupKey}.${key}` : key
}

export function assertWith<TWith>(obj: any): asserts obj is TWith {}
