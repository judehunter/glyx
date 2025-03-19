import { atom, Atom } from '../methods/atom'
import { nested } from '../methods/nested'
import {
  CalledSelect,
  select,
  Select,
  SelectInternals,
} from '../methods/select'
import { store } from '../methods/store'
import {
  getCurrentStore,
  isCurrentStoreSet,
  setCurrentStore,
  unsetCurrentStore,
} from './currentStore'
import { assertWith } from './utils'

export const makeWithAtom =
  <TIn extends Atom<any>, TOut extends Atom<any>>(
    transform: (atom: TIn) => TOut,
  ) =>
  (atom: TIn) => {
    return transform(atom)
  }

export const makeWithCalledSelect =
  <TInParams extends any[], TInReturn, TOut extends CalledSelect<TInReturn>>(
    transform: (calledSelect: CalledSelect<TInReturn>) => TOut,
  ) =>
  (select: Select<TInParams, TInReturn>) => {
    const store = getCurrentStore()

    assertWith<SelectInternals>(select)
    const internals = {
      getInternals: select.getInternals,
      setInternals: select.setInternals,
      setPartialInternals: select.setPartialInternals,
    }

    const newSelect = (...args) => {
      if (isCurrentStoreSet()) {
        throw new Error('Unexpected current store')
      }

      // todo: if select/nestedDef errors, cleanup current store?
      setCurrentStore(store)
      const calledSelect = select(...args)

      const transformed = transform(calledSelect)

      // todo: if select has no name, call setup

      unsetCurrentStore()

      return transformed
    }

    Object.assign(newSelect, internals)

    return newSelect as (...args: TInParams) => CalledSelect<TInReturn, TOut>
  }

const withPersist = makeWithCalledSelect(
  <T extends CalledSelect<any>>(x: T) => x,
)
const jj = withPersist(select)

const jjjj = withPersist(atom('a'))

const id = <T>(x: T) => x
const test = select(id)

const test2 = makeWithCalledSelect(test, (x) => ({ ...x, yeet: () => 5 }))

const test3 = nested(test, () => ({}))

test3(5).get()

test2
test(5).get()

interface X1 {
  (): number
}

interface X2 {
  (): string
}

interface X3 {
  (): number
  (a: string): string
}

const x3: X3 = (...args: any[]) => null!

type AtomTransformer = <TIn extends Atom<any>, TOut extends Atom<any>>(
  atom: TIn,
  transform: (atom: TIn) => TOut,
) => TOut

type CalledSelectTransformer = <
  TInParams extends any[],
  TInReturn,
  TOut extends CalledSelect<TInReturn>,
>(
  select: Select<TInParams, TInReturn>,
  transform: (calledSelect: CalledSelect<TInReturn>) => TOut,
) => (...args: TInParams) => CalledSelect<TInReturn, TOut>

// const makeWith = <TOverloads>() => {
//   return {
//     atom: () => {
//       return makeWith<TOverloads & AtomTransformer>()
//     },
//     make: (() => null!) as () => TOverloads,
//   }
// }

// const q = makeWith().atom().make()

const makeWith = <T extends 'atom' | 'calledSelect'>(targets: T[]) => {
  type AtomOverload = T extends 'atom' ? AtomTransformer : never
  type CalledSelectOverload = T extends 'calledSelect'
    ? CalledSelectTransformer
    : never
  type Overloads = AtomOverload & CalledSelectOverload
  return ((target: any, transform: any) => {
    if (!targets.includes(target.type)) {
      throw new Error('Invalid target')
    }

    return transform(target)
  }) as Overloads
}

const q = makeWith(['atom', 'calledSelect'])(null! as Atom<any>, (x) => x)

const makeOverloads = <T>() => {
  return {
    add: <TAdd>() => makeOverloads<T & TAdd>(),
    make: () => null!,
  }
}
