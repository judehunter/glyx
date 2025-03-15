import { setCurrentStore, unsetCurrentStore } from '../misc/currentStore'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { assertWith } from '../misc/utils'
import { Group, group, GroupInternals } from './group'

export type Store<TReturn extends Record<string, any>> = Group<TReturn>

export type StoreInternals = MakeInternals<
  {
    destroy: () => void
  } & ReturnType<GroupInternals['getInternals']>
>

/**
 * Creates a store. All atom values are stored centrally in the store.
 * Updates are fine-grained, i.e. isolated to the atom that was updated.
 * Updates are batched within a synchronous task in the event loop.
 *
 * Usage:
 * ```ts
 * const { $ } = store(() => {
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
 * const { $ } = store(() => {
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
  return new Proxy(
    {},
    {
      get(target, prop) {
        const name = prop.toString()

        const inits = [] as (() => void | (() => void))[]
        setCurrentStore({
          addOnInit: (fn) => {
            inits.push(fn)
          },
        })

        const def = defFn()
        const defGroup = group(() => def)

        assertWith<GroupInternals>(defGroup)

        // todo: name
        defGroup.getInternals().setup(name)

        const destroys = [] as (() => void)[]
        for (const fn of inits) {
          const destroy = fn()
          if (destroy) {
            destroys.push(destroy)
          }
        }

        unsetCurrentStore()

        const internals = makeInternals({
          ...defGroup.getInternals(),
          destroy: () => {
            for (const destroy of destroys) {
              destroy()
            }
          },
        })

        return { ...defGroup, ...internals }
      },
    },
  ) as Record<string, Store<T>> & { ['DESTRUCTURE TO USE!']: null }
}
