import { getCurrentStoreRef } from '../misc/currentStore'

/**
 * Runs the specified function after the whole store has been initialized.
 *
 * Should not be returned.
 *
 * Usage:
 * ```ts
 * const $ = store(() => {
 *   const a = atom(1)
 *   // a.get() is not allowed here!
 *   onInit(() => {
 *     // a.get() is allowed here!
 *   })
 *   return { a }
 * })
 * ```
 */
export const onInit = (fn: () => void | (() => void)) => {
  const currentStore = getCurrentStoreRef().current

  if (!currentStore) {
    throw new Error('onInit must be called within a store')
  }

  currentStore.addOnInit(fn)
}
