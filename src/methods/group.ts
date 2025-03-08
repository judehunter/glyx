import { atom, Atom, AtomType } from './atom'
import { CalledSelect, select, Select } from './select'

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
}

/**
 * Allows you to define a group of atoms and selects, similar to defining
 * them in an object, like:
 * ```ts
 * // do not do this!
 * const $group = {
 *   a: atom(...),
 *   b: select(() => ...),
 * }
 * ```
 * But instead, the standard declaration syntax is used, just like in a store.
 * ```ts
 * const $group = group(() => {
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

  const selectable = Object.entries(def).filter(
    ([key, value]) =>
      '_glyx' in value && ['atom', 'select'].includes(value._glyx.type),
  )

  const pickFn = <const TKeys>(keys: TKeys[] & (keyof TReturn)[]) => {
    return Object.fromEntries(
      selectable
        .filter(([key]) => keys.includes(key as any))
        .map(([key, value]) => [key, value.get()]),
    )
  }

  // const s = <T

  const pick = select(pickFn)

  // const pick = select(makePick<TReturn>(selectable)) as any as SelectFromFn<
  //   ReturnType<typeof makePick<TReturn>>
  // >

  const internals = {
    _glyx: { type: 'group' },
  } as any as {}

  return {
    ...internals,
    pick,
    // s: select,
    /**
     * Convenience `select` that returns a specified
     * subset of the group's atoms and selects, returned
     * in one combined object.
     *
     * Usage:
     * ```ts
     * const $ = store(() => {
     *   const $group = group(() => {
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
    // pick,
    ...def,
  } as any as Group<TReturn>
}
