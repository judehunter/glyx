import { assertWith } from '../../test/utils'
import { setCurrentStore, unsetCurrentStore } from '../misc/currentStore'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { pubsub } from '../misc/pubsub'
import { Handles, setupGroup } from '../misc/setup'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'
import { Group, group, GroupInternals } from './group'

export type Store<TReturn extends Record<string, any>> = Group<TReturn>

export type StoreInternals = MakeInternals<
  {
    getStored: () => ReturnType<typeof pubsub>
  } & ReturnType<GroupInternals['getInternals']>
>

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
  setCurrentStore({
    addOnInit: (fn) => {
      initSubbed.push(fn)
    },
    handles: stored,
  })

  const def = defFn()
  const defGroup = group(() => def)

  assertWith<GroupInternals>(defGroup)

  defGroup.getInternals().setup(null)

  for (const fn of initSubbed) {
    fn(stored)
  }

  unsetCurrentStore()

  const internals = makeInternals({
    ...defGroup.getInternals(),
    getStored: () => stored,
  })

  return { ...defGroup, ...internals } as Store<T>
}
