import { Brand } from '../misc/brand'
import { setupGroup } from '../misc/setup'
import { attachObjToFn, makeKey } from '../misc/utils'
import { atom, Atom } from './atom'
import { CalledSelect, Select, select, SelectInternals } from './select'

// TODO:
// type NestedOnAtom<TValue, TNested> = Atom<TValue> & TNested

const nestedOnSelect = (
  select: Select<any, any> & SelectInternals,
  nestedDef: (calledSelect: CalledSelect) => Record<string, any>,
) => {
  const newSelect = ((...args) => {
    // we need to attach the glyx object here since otherwise the setup
    // in store() will only put it on the wrapper
    select._glyx = newSelect._glyx
    const calledSelect = select(...args)
    const nested = nestedDef(calledSelect)

    setupGroup(
      {
        get: undefined as any, // TODO
        getAll: () => newSelect._glyx.getAll(),
        sub: newSelect._glyx.subWithDeps,
        set: undefined as any, // TODO
      },
      nested,
      newSelect._glyx.name,
    )

    return { ...calledSelect, ...nested }
  }) as Select<any, any> & SelectInternals

  return attachObjToFn(newSelect, {
    _glyx: {
      type: 'select',
    },
  }) as any
}

const nestedOnAtom = (
  atom: Atom,
  nestedDef: (atomObj: Atom) => Record<string, any>,
) => {
  return Object.assign(atom, nestedDef(atom))
}

function nested<TParams extends any[], TReturn, TNested>(
  select: Select<TParams, TReturn>,
  nestedDef: (calledSelect: CalledSelect<TReturn>) => TNested,
): (...args: TParams) => CalledSelect<TReturn, TNested>

function nested<TValue, TNested>(
  atom: Atom<TValue>,
  nestedDef: (atom: NoInfer<Atom<TValue>>) => TNested,
): Atom<TValue> & TNested

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
  if ((selectOrAtom as any)._glyx.type === 'select') {
    return nestedOnSelect(selectOrAtom as any, nestedDef as any)
  }

  return nestedOnAtom(selectOrAtom as Atom, nestedDef as any)
}

export { nested }
