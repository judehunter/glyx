import { callAndTrackDeps } from '../misc/deps'
import { Atom, atom } from './atom'
import { onInit } from './onInit'

export type Derived<TValue> = Omit<Atom<TValue>, 'set'>

/**
 * Creates an atom that is automatically updated when the
 *
 * When compared to a `select`, the value of this atom, like any other
 * atom, is stored in the store. Whereas a `select` is recalculated
 * in components.
 *
 * This should be used instead of a `select` when the derived/calculated
 * value is commonly used, mauinly as an optimization method.
 * In addition, only a `select` can accept arguments - an argumentless
 * select can often be replaced with a derived atom, though semanticity
 * should be considered as well.
 *
 * Usage:
 * ```ts
 * const $ = store(() => {
 *   const foo = atom(1)
 *   const bar = derived(() => foo.get() * 2)
 *   return { foo, bar }
 * })
 *
 * $.foo.get() // use any atom method
 * ```
 */
export const derived = <TValue>(fn: (...args: any[]) => TValue) => {
  const target = atom<TValue>(undefined!)

  onInit(({ sub }) => {
    const { value, depsList } = callAndTrackDeps(
      { trackDeps: true, errorOnAlreadyTrackingDeps: true },
      fn,
    )

    target.set(value)

    if (!depsList) {
      return
    }

    return sub(depsList, () => {
      target.set(fn())
    })
  })

  return target as Derived<TValue>
}
