export const attachObjToFn = <
  TFn extends (...args: any[]) => any,
  TObj extends Record<string, any>,
>(
  fn: TFn,
  obj: TObj,
) => {
  for (const key in obj) {
    ;(fn as any)[key] = obj[key]
  }
  return fn as TFn & TObj
}

export const uniqueDeps = (a: string[], b: string[]) => {
  return [...new Set([...a, ...b])]
}

export const identity = <T>(x: T) => x
