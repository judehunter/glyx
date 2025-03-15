import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'
import { CalledSelect, select } from './select'

type MapDeep<T extends any> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? never
    : K]: T[K] extends Record<string, any>
    ? // todo: improve this (there's no better way to check the type of the atom currently)
      T[K] extends { set: (value: infer R) => any }
      ? R
      : MapDeep<T[K]>
    : T[K]
}

export type Group<TReturn> = TReturn & {
  pick: <const TKeys extends keyof TReturn>(
    keys: TKeys[],
  ) => CalledSelect<{
    [K in keyof Pick<TReturn, TKeys>]: Pick<TReturn, TKeys>[K] extends Atom<
      infer AT
    >
      ? AT
      : never
  }>
  use: () => MapDeep<TReturn>
  get: () => MapDeep<TReturn>
  with: <TOut>(apply: (group: Group<TReturn>) => TOut) => TOut
}

export type GroupInternals = MakeInternals<{
  type: 'group'
  name: string | null
  setup: (name: string | null) => void
}>

/**
 * Allows you to define a group of atoms and selects, similar to defining
 * them in an object, like:
 * ```ts
 * // do not do this!
 * const { $ }group = {
 *   a: atom(...),
 *   b: select(() => ...),
 * }
 * ```
 * But instead, the standard declaration syntax is used, just like in a store.
 * ```ts
 * const { $ }group = group(() => {
 *   const a = atom(...)
 *   const b = select(() => ...)
 *   return { a, b }
 * })
 * ```
 * In fact, a store is a root-level group itself.
 *
 * Using `group` instead of an object is conventional because it supports all
 * features of Glyx (e.g. `watch`, `pick`). Object literals should not be used
 * and are only shown here for comparison.
 */
export const group = <TReturn extends Record<string, any>>(
  defFn: () => TReturn,
) => {
  const def = defFn()

  const selectable = Object.entries(def).filter(([key, value]) =>
    ['atom', 'group'].includes(value.getInternals?.().type),
  )

  const pickFn = <const TKeys>(keys: TKeys[] & (keyof TReturn)[]) => {
    return Object.fromEntries(
      selectable
        .filter(([key]) => keys.includes(key as any))
        .map(([key, value]) => [key, value.get()]),
    )
  }

  const pick = select(pickFn, { dynamicDeps: true })

  const use = () => pick(selectable.map(([key]) => key)).use()
  const get = () => pick(selectable.map(([key]) => key)).get()

  const withFn = (apply: (group: Group<any>) => any) => {
    return apply(target as any)
  }

  const internals = makeInternals({
    type: 'group',
    setup: (name: string | null) => {
      internals.setPartialInternals({ name } as any)

      for (const key of Object.keys(def)) {
        const value = def[key]
        if (value.getInternals?.().setup) {
          value.getInternals().setup(name ? makeKey(name, key) : key)
        }
      }
    },
  })

  const target = {
    ...(internals as {}),
    /**
     * Applies a HOF as middleware on the group. The return type
     * of the HOF will be the return value of the function, letting
     * you affect the type of the group and chain middleware.
     *
     * Do not use this outside of a store. In a future version,
     * the method will not be visible in intellisense outside of the store.
     */
    with: withFn as Group<TReturn>['with'],
    /**
     * TODO: jsdoc
     */
    use: use as Group<TReturn>['use'],
    /**
     * TODO: jsdoc
     */
    get: get as Group<TReturn>['get'],
    /**
     * Convenience `select` that returns a specified
     * subset of the group's atoms, selects, and groups - returned
     * in one combined object.
     *
     * Usage:
     * ```ts
     * const { $ } = store(() => {
     *   const { $ }group = group(() => {
     *     const a = atom(1)
     *     const b = atom(2)
     *     const c = atom(3)
     *
     *     return { a, b, c }
     *   })
     * })
     *
     * $.$group.pick(['a', 'b']).get() // { a: 1, b: 2 }
     * // functions like any other select
     * ```
     */
    pick: pick as Group<TReturn>['pick'],
    ...def,
  }

  return target
}
