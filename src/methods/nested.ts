import { setupGroup } from '../misc/setup'
import { attachObjToFn, makeKey } from '../misc/utils'
import { atom, Atom } from './atom'
import { CalledSelect, Select, select, SelectInternals } from './select'

type NestedOnAtom = any

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
  nestedDef: (
    selectObj: ReturnType<ReturnType<typeof select>>,
  ) => Record<string, any>,
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

function nested(selectOrAtom: Select<any, any> | Atom, nestedDef: unknown) {
  if ((selectOrAtom as any)._glyx.type === 'select') {
    return nestedOnSelect(selectOrAtom as any, nestedDef as any)
  }

  return nestedOnAtom(selectOrAtom as Atom, nestedDef as any)
}

export { nested }
