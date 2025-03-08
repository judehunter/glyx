import { Handles } from './setup'

let CURRENT_STORE_REF: {
  current:
    | {
        addOnInit: (fn: (handles: Handles) => void) => void
      }
    | undefined
} = { current: undefined }

export const setCurrentStoreRef = (
  val: (typeof CURRENT_STORE_REF)['current'],
) => {
  CURRENT_STORE_REF.current = val
}

export const unsetCurrentStoreRef = () => {
  setCurrentStoreRef(undefined)
}

export const getCurrentStoreRef = () => CURRENT_STORE_REF
