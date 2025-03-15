let CURRENT_STORE_REF: {
  current:
    | {
        addOnInit: (fn: () => void | (() => void)) => void
      }
    | undefined
} = { current: undefined }

export type CurrentStore = NonNullable<(typeof CURRENT_STORE_REF)['current']>

export const setCurrentStore = (val: (typeof CURRENT_STORE_REF)['current']) => {
  CURRENT_STORE_REF.current = val
}

export const unsetCurrentStore = () => {
  setCurrentStore(undefined)
}

export const getCurrentStoreRef = () => CURRENT_STORE_REF

export const isCurrentStoreSet = () =>
  getCurrentStoreRef().current !== undefined

export const getCurrentStore = () => {
  const store = getCurrentStoreRef().current
  if (!store) {
    throw new Error('No store found')
  }
  return store
}
