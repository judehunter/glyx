import { useRef, useMemo } from 'react'
import { getNoTrack, pushToDepsListIfTracking } from '../misc/deps'
import { runInlineSelector } from '../misc/runInlineSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { identity, uniqueDeps } from '../misc/utils'
import { onInit } from './onInit'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { pubsub } from '../misc/pubsub'
import { makePath } from '../misc/makePath'
import * as TB from 'ts-toolbelt'
import { CalledSelect } from './select'
import { getCurrentStore, getCurrentStoreRef } from '../misc/currentStore'
import { IsActualObject } from '../misc/isObject'

type PathFn<TValue> = <TPath extends string>(
  path: TB.Function.AutoPath<TValue, TPath>,
) => CalledSelect<TB.Object.Path<TValue, TB.String.Split<TPath, '.'>>>

export type AtomLike<TValue = unknown> = {
  get<TCustomSelected = TValue>(
    customSelector?: (value: TValue) => TCustomSelected,
  ): TCustomSelected
  use<TCustomSelected = TValue>(
    customSelector?: (value: TValue) => TCustomSelected,
    eqFn?: (a: any, b: any) => boolean,
  ): TCustomSelected
  sub(listener: (value: TValue) => void): () => void
  set(value: TValue): void
} & (IsActualObject<TValue> extends true ? { path: PathFn<TValue> } : {})

export type Atom<TValue = unknown> = AtomLike<TValue>

export type InferAtomValue<T extends Atom> = T extends Atom<infer TValue>
  ? TValue
  : never

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
  (target: Atom & AtomInternals) => (inlineSelector?: (value: any) => any) => {
    // todo: throw if before init

    if (!getNoTrack()) {
      pushToDepsListIfTracking(target.getInternals().name)
    }

    const value = (inlineSelector ?? identity)(
      pubsub.getKey(target.getInternals().name),
    )
    return value
  }

const makeUse =
  (target: Atom & AtomInternals) =>
  (
    inlineSelector?: (value: any) => any,
    eqFn?: (a: any, b: any) => boolean,
  ) => {
    const inlineSelectorDepsRef = useRef<undefined | string[]>(undefined)

    const subscribe = useMemo(
      () => (listener) => {
        if (!inlineSelectorDepsRef.current) {
          throw new Error('inlineSelectorDepsRef.current is undefined')
        }

        return pubsub.subKeys(
          uniqueDeps(
            [target.getInternals().name],
            inlineSelectorDepsRef.current,
          ),
          listener,
        )
      },
      [],
    )

    return useSyncExternalStoreWithSelector(
      subscribe,
      // see note in select.use
      pubsub.getAll,
      pubsub.getAll,
      () => {
        const value = target.get()

        return runInlineSelector({
          inlineSelector,
          inlineSelectorDepsRef,
          value,
        })
      },
      eqFn,
    )
  }

const makeSub =
  (target: Atom & AtomInternals) => (listener: (value: any) => void) => {
    return pubsub.subKeys([target.getInternals().name], listener)
  }

const makeSet = (target: Atom & AtomInternals) => (value: any) => {
  pubsub.setKey(target.getInternals().name, value)
}

/**
 * Creates an atom with the given initial value. The atom's value
 * is persisted within the store.
 *
 * Usage:
 *
 * ```tsx
 * const { $ } = store(() => {
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
export const atom = <TValue>(
  initialValue: TValue,
  { name }: { name?: string } = {},
) => {
  const internals = makeInternals({
    type: 'atom',
    setup: (name: string) => {
      internals.setPartialInternals({ name } as any)
    },
  })

  onInit(() => {
    const gotInternals = internals.getInternals() as any
    const resolvedName = name ?? gotInternals.name ?? pubsub.getAnonName()
    if (!gotInternals.name) {
      internals.setPartialInternals({ name: resolvedName } as any)
    }
    pubsub.assertNameNotExists(resolvedName)
    pubsub.setKeyInitialValue(resolvedName, initialValue)
  })

  const get = ((...pass: Parameters<ReturnType<typeof makeGet>>) =>
    makeGet(target as any)(...pass)) as Atom<TValue>['get']

  const use = ((...pass: Parameters<ReturnType<typeof makeUse>>) =>
    makeUse(target as any)(...pass)) as Atom<TValue>['use']

  const sub = ((...pass: Parameters<ReturnType<typeof makeSub>>) =>
    makeSub(target as any)(...pass)) as Atom<TValue>['sub']

  const set = ((...pass: Parameters<ReturnType<typeof makeSet>>) =>
    makeSet(target as any)(...pass)) as Atom<TValue>['set']

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
     * Subscribes to the atom with a callback function.
     *
     * This is useful for
     * - manual subscriptions in effects,
     * - transient updates of components
     * - advanced use cases like building other glyx primitives (see: `event`)
     *
     * You probably don't need to use it in most cases.
     */
    sub,

    /**
     * Sets the value of the atom and notifies all dependants.
     *
     * Atom updates are batched, and will be committed once all
     * synchronous code runs. If you want to force the commit,
     * call `$.flush()`. However, this is normally
     * discouraged.
     */
    set,

    /**
     * Allows to dot-access nested properties of the atom value.
     *
     * This is crucial for enabling fine-reactivity. Subscribers of
     * nested paths will only be notified when that part of the state changes.
     * Note that, currently, this requires that you `.set()` just the part
     * of the state that changed. In other words, there is no automatic
     * nested change detection.
     *
     * Usage:
     *
     * ```tsx
     * const obj = atom({ a: { b: 1 } })
     * $.path('a.b').get()
     * $.path('a.b').use()
     * $.path('a.b').set(2)
     * ```
     */
  }

  return { ...target, path: makePath(target as any) } as Atom<TValue>
}
