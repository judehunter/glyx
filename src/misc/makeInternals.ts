export type MakeInternals<T> = {
  getInternals: () => T
  setInternals: (newInternals: T) => void
  setPartialInternals: (newInternals: Partial<T>) => void
}

export const makeInternals = <T>(value: Record<string, any>) => {
  let internals = Object.freeze(value as T)

  const getInternals = () => internals

  const setInternals = (newInternals: T) => {
    internals = Object.freeze(newInternals)
  }

  const setPartialInternals = (newInternals: Partial<T>) => {
    internals = Object.freeze({ ...internals, ...newInternals })
  }

  return { getInternals, setInternals, setPartialInternals }
}
