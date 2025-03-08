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
  ): TCustomSelected
  sub(listener: (value: TValue) => void): () => void
  set(value: TValue): void

  _glyx: {
    type: 'atom'
    initialValue: TValue

    // supplied by store:
    name: string
    get(): TValue
    getAll(): Record<string, unknown>
    sub(listener: (value: TValue) => void): () => void
    subWithDeps: (
      deps: string[],
      listener: (value: unknown) => void,
    ) => () => void
    set(value: TValue): void
  }
}

const makeGet = (target: Atom) => (customSelector?: (value: any) => any) => {
  pushToDepsListIfTracking(target._glyx.name)

  const value = (customSelector ?? identity)(target._glyx.get())
  return value
}

const makeUse =
  (target: Atom) =>
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

const makeSub = (target: Atom) => () => {
  throw new Error('sub is not implemented for atom')
}

const makeSet = (target: Atom) => (value: any) => {
  target._glyx.set(value)
}

export const atom = <TValue>(initialValue: TValue) => {
  const target = {
    _glyx: { type: 'atom', initialValue } as Atom<TValue>['_glyx'],

    get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
      makeGet(target)(...pass),

    use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
      makeUse(target)(...pass),

    sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
      makeSub(target)(...pass),

    set: (...pass: Parameters<ReturnType<typeof makeSet>>) =>
      makeSet(target)(...pass),
  } satisfies Atom<TValue>

  return target as Atom<TValue>
}
