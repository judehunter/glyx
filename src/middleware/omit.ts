export const omit =
  <T extends Record<string, any>, TOmitted extends keyof T>(keys: TOmitted[]) =>
  (obj: T) => {
    const copy = { ...obj }

    for (const key of keys) {
      delete copy[key]
    }

    return { getInternals: obj.getInternals, ...copy } as any as Omit<
      T,
      TOmitted
    >
  }
