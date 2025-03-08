import {
  getCurrentStore,
  isCurrentStoreSet,
  setCurrentStore,
  unsetCurrentStore,
} from '../misc/currentStore'
import { makeInternals } from '../misc/makeInternals'
import { attachObjToFn, makeKey } from '../misc/utils'
import { Atom } from './atom'
import { CalledSelect, Select, SelectInternals } from './select'

// TODO:
// type NestedOnAtom<TValue, TNested> = Atom<TValue> & TNested

const nestedOnSelect = (
  select: Select<any, any> & SelectInternals,
  nestedDef: (calledSelect: CalledSelect) => Record<string, any>,
) => {
  const store = getCurrentStore()

  const internals = makeInternals({
    type: 'select',
    nested: true, // for users?
    setup: (name: string) => {
      internals.setPartialInternals({ name } as any)
    },
  })

  const newSelect = ((...args) => {
    if (isCurrentStoreSet()) {
      throw new Error('Unexpected current store')
    }
    // todo: if select/nestedDef errors, cleanup current store?
    setCurrentStore(store)
    const calledSelect = select(...args)

    // todo: if select has no name, call setup

    const nested = nestedDef(calledSelect)
    unsetCurrentStore()

    const name = (internals.getInternals() as any).name

    for (const key of Object.keys(nested)) {
      const value = nested[key]
      value.getInternals?.().setup(name ? makeKey(name, key) : key)
    }

    return { ...calledSelect, ...nested }
  }) as Select<any, any> & SelectInternals

  return attachObjToFn(newSelect, {
    ...(internals as {}),
  }) as any
}

const nestedOnAtom = (
  atom: Atom,
  nestedDef: (atomObj: Atom) => Record<string, any>,
) => {
  return { ...atom, ...nestedDef(atom) }
}

function nested<TParams extends any[], TReturn, TNested>(
  select: Select<TParams, TReturn>,
  nestedDef: (calledSelect: CalledSelect<TReturn>) => TNested,
): (...args: TParams) => CalledSelect<TReturn, TNested>

function nested<TAtom extends Atom<any>, TNested>(
  atom: TAtom,
  nestedDef: (atom: NoInfer<TAtom>) => TNested,
): TAtom & TNested

/**
 * Attaches a nested group directly to a select or an atom.
 *
 * In addition, when attaching to a select,
 * the nested group has access to that select's value for some given arguments,
 * which allows a pattern of partial application for selects.
 *
 * Comparison:
 * ```ts
 * const $group = group(() => {
 *   const a = atom(1)
 *   return { a }
 * })
 * $.$group.a.get()
 * $.$group.a.use()
 * $.$group.a.set()
 * $.$group.pick(['a']).get()
 * $.$group.pick(['a']).use()
 * $.$group.pick(['a']).set()
 *
 * const a = nested(
 *   atom(1),
 *   (group) => {
 *     const double = select(() => group.a.get() * 2)
 *     return { double }
 *   }
 * )
 * a.get()
 * a.use()
 * a.set()
 * // the group lives directly on the atom.
 * a.double.get()
 * a.double.use()
 * ```
 *
 * Note that supporting `pick` in `nested` is not yet implemented.
 */
function nested(selectOrAtom: Select<any, any> | Atom, nestedDef: unknown) {
  if ((selectOrAtom as any).getInternals().type === 'select') {
    return nestedOnSelect(selectOrAtom as any, nestedDef as any)
  }

  return nestedOnAtom(selectOrAtom as Atom, nestedDef as any)
}

export { nested }
