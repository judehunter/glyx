export const pick =
  <T extends Record<string, any>, TPicked extends keyof T>(keys: TPicked[]) =>
  (obj: T) => {
    return keys.reduce(
      (acc, key) => {
        acc[key] = obj[key]
        return acc
      },
      { getInternals: obj.getInternals } as any as Pick<T, TPicked>,
    )
  }
