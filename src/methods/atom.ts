import { useRef, useMemo } from 'react'
import { pushToDepsListIfTracking } from '../misc/deps'
import { runCustomSelector } from '../misc/runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { identity, uniqueDeps } from '../misc/utils'

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
}

export type AtomInternals = {
  _glyx: {
    type: 'atom'
    initialValue: unknown
    onInit?: () => void

    // supplied by store:
    name: string
    get(): unknown
    getAll(): Record<string, unknown>
    sub(listener: (value: unknown) => void): () => void
    subWithDeps: (
      deps: string[],
      listener: (value: unknown) => void,
    ) => () => void
    set(value: unknown): void
  }
}

export type AtomType<TAtom extends Atom> = TAtom extends Atom<infer TValue>
  ? TValue
  : never

const makeGet =
  (target: Atom & AtomInternals) => (customSelector?: (value: any) => any) => {
    pushToDepsListIfTracking(target._glyx.name)

    const value = (customSelector ?? identity)(target._glyx.get())
    return value
  }

const makeUse =
  (target: Atom & AtomInternals) =>
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

        return target._glyx.subWithDeps(
          uniqueDeps([target._glyx.name], customSelectorDepsRef.current),
          listener,
        )
      },
      [],
    )

    return useSyncExternalStoreWithSelector(
      subscribe,
      // see note in select.use
      target._glyx.getAll,
      target._glyx.getAll,
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
  (target: Atom & AtomInternals) => (listener: (value: any) => void) => {
    return target._glyx.sub(listener)
  }

const makeSet = (target: Atom & AtomInternals) => (value: any) => {
  target._glyx.set(value)
}

export const atom = <TValue>(initialValue: TValue) => {
  const target = {
    _glyx: { type: 'atom', initialValue } as AtomInternals['_glyx'],

    get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
      makeGet(target)(...pass),

    use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
      makeUse(target)(...pass),

    sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
      makeSub(target)(...pass),

    set: (...pass: Parameters<ReturnType<typeof makeSet>>) =>
      makeSet(target)(...pass),
  } satisfies Atom<TValue> & AtomInternals

  return target as Atom<TValue>
}
