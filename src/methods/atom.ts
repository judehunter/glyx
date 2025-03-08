import { useRef, useMemo } from 'react'
import { pushToDepsListIfTracking } from '../misc/deps'
import { runCustomSelector } from '../misc/runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { identity, uniqueDeps } from '../misc/utils'
import { Brand } from '../misc/brand'
import {
  CurrentStore,
  getCurrentStore,
  getCurrentStoreRef,
} from '../misc/currentStore'
import { onInit } from './onInit'
import { assertWith } from '../../test/utils'
import { MakeInternals, makeInternals } from '../misc/makeInternals'

export type Atom<TValue = unknown> = {
  get<TCustomSelected = TValue>(
    customSelector?: (value: TValue) => TCustomSelected,
  ): TCustomSelected
  use<TCustomSelected = TValue>(
    customSelector?: (value: TValue) => TCustomSelected,
    eqFn?: (a: any, b: any) => boolean,
  ): TCustomSelected
  sub(listener: (value: TValue) => void): () => void
  set(value: TValue): void
  with<TOut>(applyFn: (atom: Atom<TValue>) => TOut): TOut
}

export type AtomInternals = MakeInternals<{
  type: 'atom'
  name: string
  setup: (name: string) => void
}>

// export type AtomBrand = Brand<'atom'>

export type AtomType<TAtom extends Atom> = TAtom extends Atom<infer TValue>
  ? TValue
  : never

const makeGet =
  (target: Atom & AtomInternals, store: CurrentStore) =>
  (customSelector?: (value: any) => any) => {
    // todo: throw if before init

    pushToDepsListIfTracking(target.getInternals().name)

    const value = (customSelector ?? identity)(
      store.handles.getKey(target.getInternals().name),
    )
    return value
  }

const makeUse =
  (target: Atom & AtomInternals, store: CurrentStore) =>
  (
    customSelector?: (value: any) => any,
    eqFn?: (a: any, b: any) => boolean,
  ) => {
    const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

    const subscribe = useMemo(
      () => (listener) => {
        if (!customSelectorDepsRef.current) {
          throw new Error('customSelectorDepsRef.current is undefined')
        }

        return store.handles.subKeys(
          uniqueDeps(
            [target.getInternals().name],
            customSelectorDepsRef.current,
          ),
          listener,
        )
      },
      [],
    )

    return useSyncExternalStoreWithSelector(
      subscribe,
      // see note in select.use
      store.handles.getAll,
      store.handles.getAll,
      () => {
        const value = target.get()

        return runCustomSelector({
          customSelector,
          customSelectorDepsRef,
          value,
        })
      },
      eqFn,
    )
  }

const makeSub =
  (target: Atom & AtomInternals, store: CurrentStore) =>
  (listener: (value: any) => void) => {
    return store.handles.subKeys([target.getInternals().name], listener)
  }

const makeSet =
  (target: Atom & AtomInternals, store: CurrentStore) => (value: any) => {
    store.handles.setKey(target.getInternals().name, value)
  }

const makeWith =
  (target: Atom & AtomInternals) => (apply: (atom: Atom) => any) => {
    return apply(target as any)
  }

/**
 * Creates an atom with the given initial value. The atom's value
 * is persisted within the store.
 *
 * Usage:
 *
 * ```tsx
 * const $ = store(() => {
 *   const foo = atom(1)
 *   return { foo }
 * })
 *
 * $.foo.get()
 * $.foo.get(x => x * 2) // with an inline selector
 * $.foo.use() // in a component
 * $.foo.use(x => x * 2, [eqFn]) // in a component, with an inline selector
 * $.foo.set(2)
 * ```
 *
 * Do not use `.get()` directly inside store, only in a callback,
 * such as inside a `select`, `derived` or `onInit`. This is because the atom
 * needs to be initialized before it can be used, which happens after
 * it is returned from the store.
 *
 * @param initialValue - The initial value of the atom.
 */
export const atom = <TValue>(initialValue: TValue) => {
  const store = getCurrentStore()

  const internals = makeInternals({
    type: 'atom',
    setup: (name: string) => {
      internals.setPartialInternals({ name } as any)
    },
  })

  onInit(({ setKeyInitialValue, getAnonName }) => {
    if (!(internals.getInternals() as any).name) {
      internals.setPartialInternals({ name: getAnonName() } as any)
    }
    setKeyInitialValue((internals.getInternals() as any).name, initialValue)
  })

  const get = ((...pass: Parameters<ReturnType<typeof makeGet>>) =>
    makeGet(target as any, store)(...pass)) as Atom<TValue>['get']

  const use = ((...pass: Parameters<ReturnType<typeof makeUse>>) =>
    makeUse(target as any, store)(...pass)) as Atom<TValue>['use']

  const sub = ((...pass: Parameters<ReturnType<typeof makeSub>>) =>
    makeSub(target as any, store)(...pass)) as Atom<TValue>['sub']

  const set = ((...pass: Parameters<ReturnType<typeof makeSet>>) =>
    makeSet(target as any, store)(...pass)) as Atom<TValue>['set']

  const withFn = ((...pass: Parameters<ReturnType<typeof makeWith>>) =>
    makeWith(target as any)(...pass)) as Atom<TValue>['with']

  const target = {
    ...(internals as {}),

    /**
     * Gets the value of the atom - can be used anywhere.
     * Allows an optional inline selector.
     *
     * Calling this function from a `select` or `derived` will capture
     * this atom as a dependency.
     */
    get,

    /**
     * Subscribes to the atom in a React component.
     * Rules of hooks apply.
     * Allows an optional inline selector.
     *
     * You should not call this function from a `select` or `derived`. Use `.get()` instead.
     */
    use,

    /**
     * Not implemented
     */
    sub,

    /**
     * Sets the value of the atom and notifies all dependants.
     *
     * Atom updates are batched, and will be committed once all
     * synchronous code runs. If you want to force the commit,
     * call `$._glyx.getStored().flush()`. However, this is normally
     * discouraged.
     */
    set,

    /**
     * Applies a HOF as middleware on the atom. The return type
     * of the HOF will be the return value of the function, letting
     * you affect the type of the atom and chain middleware.
     *
     * Do not use this outside of a store. In a future version,
     * the method will not be visible in intellisense outside of the store.
     */
    with: withFn,
  }

  return target
}
