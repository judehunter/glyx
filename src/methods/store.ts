import { assertWith } from '../../test/utils'
import { setCurrentStore, unsetCurrentStore } from '../misc/currentStore'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { pubsub } from '../misc/pubsub'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'
import { Group, group, GroupInternals } from './group'

export type Store<TReturn extends Record<string, any>> = Group<TReturn>

export type StoreInternals = MakeInternals<
  {} & ReturnType<GroupInternals['getInternals']>
>

/**
 * Creates a store. All atom values are stored centrally in the store.
 * Updates are fine-grained, i.e. isolated to the atom that was updated.
 * Updates are batched within a synchronous task in the event loop.
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
 * ---
 *
 * Primitives are internally assigned names corresponding to the
 * key in the returned object literal. Not returning a primitive will make it anonymous,
 * meaning it will be automatically assigned a serial name. You can specify
 * a name for a primitive you don't want to return by using the `name` middleware.
 * ```ts
 * const $ = store(() => {
 *   const a = atom(1).with(name('foo'))
 *   const getA = () => a.get()
 *   return { getA }
 * })
 * // can't access $.a nor $.foo
 * $.getA() // 1
 * // in devtools, the atom will be named 'foo'
 * ```
 *
 * @param defFn define the store inside this callback, and return everything.
 * @returns the initialized store, ready to use.
 */
export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const initSubbed = [] as (() => void)[]
  setCurrentStore({
    addOnInit: (fn) => {
      initSubbed.push(fn)
    },
  })

  const def = defFn()
  const defGroup = group(() => def)

  assertWith<GroupInternals>(defGroup)

  // todo: name
  defGroup.getInternals().setup('$')

  for (const fn of initSubbed) {
    fn()
  }

  unsetCurrentStore()

  const internals = makeInternals({
    ...defGroup.getInternals(),
  })

  return { ...defGroup, ...internals } as Store<T>
}
