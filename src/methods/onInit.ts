import { getCurrentStoreRef } from '../misc/currentStore'
import { Handles } from '../misc/setup'

export const onInit = (fn: (handles: Handles) => void) => {
  const currentStore = getCurrentStoreRef().current

  if (!currentStore) {
    throw new Error('onInit must be called within a store')
  }

  currentStore.addOnInit(fn)
}
