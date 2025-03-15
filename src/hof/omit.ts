export const omit =
  <T extends Record<string, any>, TOmitted extends keyof T>(keys: TOmitted[]) =>
  <T2 extends T>(obj: T2) => {
    const copy = { ...obj }

    for (const key of keys) {
      delete copy[key]
    }

    return { getInternals: obj.getInternals, ...copy } as any as Omit<
      T2,
      TOmitted
    >
  }
