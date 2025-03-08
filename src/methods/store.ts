import { setCurrentStoreRef, unsetCurrentStoreRef } from '../misc/currentStore'
import { pubsub } from '../misc/pubsub'
import { Handles, setupGroup } from '../misc/setup'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'
import { Group, group } from './group'

export type Store<TReturn extends Record<string, any>> = Group<TReturn>

export type StoreInternals = {
  _glyx: {
    getStored: () => ReturnType<typeof pubsub>
  }
}

/**
 * Creates a store. Make sure that ALL atoms, selects, etc.
 * are returned from the callback. `watch` and `onInit` are exceptions
 * to this rule.
 *
 * Usage:
 * ```ts
 * const $ = store(() => {
 *   const a = atom(1)
 *   return { a }
 * })
 * $.a.get()
 * ```
 * See other methods for more usage examples.
 *
 * @param defFn define the store inside this callback, and return everything.
 * @returns the initialized store, ready to use.
 */
export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const stored = pubsub()

  const initSubbed = [] as ((handles: Handles) => void)[]
  setCurrentStoreRef({
    addOnInit: (fn) => {
      initSubbed.push(fn)
    },
  })

  const def = defFn()
  const defGroup = group(() => def)

  setupGroup(stored, defGroup, undefined)

  for (const fn of initSubbed) {
    fn(stored)
  }

  unsetCurrentStoreRef()

  return { ...defGroup, _glyx: { getStored: () => stored } } as Store<T>
}
