import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../misc/deps'
import { runInlineSelector } from '../misc/runInlineSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../misc/utils'
import { getCurrentStore } from '../misc/currentStore'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { pubsub } from '../misc/pubsub'
import { atom } from './atom'

export type CalledSelect<TSelected = unknown, TNested = {}> = {
  get<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  set(value: TSelected): void
  use<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  sub(listener: (value: TSelected) => void): () => void
} & TNested

export type Select<TArg, TReturn> = (
  ...arg: TArg extends undefined ? [] : [TArg]
) => CalledSelect<TReturn>

export type SelectInternals = MakeInternals<{
  type: 'select'
  name: string
  depsList: undefined | string[]
  dynamicDeps: boolean
  setup: (name: string) => void
}>

const makeGet =
  (
    target: Select<any, any> & SelectInternals,
    arg: any,
    selector: (arg: any) => any,
  ) =>
  (customSelector?: (arg: any) => any) => {
    const targetInternals = target.getInternals()
    const { value: selectedValue, depsList } = callAndTrackDeps(
      {
        trackDeps: !targetInternals.depsList && !targetInternals.dynamicDeps,
      },
      () => selector(arg),
    )
    if (target.getInternals().depsList === undefined) {
      target.setPartialInternals({ depsList })
    }

    // todo: add error handling and cleanup of deps on error
    const value = (customSelector ?? identity)(selectedValue)

    return value
  }

const makeSet =
  (arg: any, set: (arg: any, value: any) => void) => (value: any) => {
    set(arg, value)
  }

const makeUse =
  (target: Select<any, any> & SelectInternals, arg: any) =>
  (inlineSelector?: (arg: any) => any, eqFn?: (a: any, b: any) => boolean) => {
    const inlineSelectorDepsRef = useRef<undefined | string[]>(undefined)

    const subscribe = useMemo(
      () => (listener) => {
        if (!inlineSelectorDepsRef.current) {
          throw new Error('inlineSelectorDepsRef.current is undefined')
        }
        const targetInternals = target.getInternals()
        let depsList = targetInternals.depsList
        if (!depsList) {
          if (targetInternals.dynamicDeps) {
            depsList = []
          } else {
            throw new Error('depsList is undefined')
          }
        }

        return pubsub.subKeys(
          uniqueDeps(depsList, inlineSelectorDepsRef.current),
          listener,
        )
      },
      [],
    )

    return useSyncExternalStoreWithSelector(
      subscribe,
      // the snapshot is used here only to check the reference,
      // and the reference changes when the store is updated.
      // so between store updates (and re-renders for other reasons),
      // if React calls getSnapshot, the selector won't be re-run,
      // and the previously selected value will be reused.
      pubsub.getAll,
      pubsub.getAll,
      () => {
        const targetInternals = target.getInternals()
        if (targetInternals.dynamicDeps) {
          return runInlineSelector({
            inlineSelector: () =>
              (inlineSelector ?? identity)(target(arg).get()),
            inlineSelectorDepsRef,
            value: undefined,
          })
        }
        const value = target(arg).get()

        return runInlineSelector({
          inlineSelector,
          inlineSelectorDepsRef,
          value,
        })
      },
      eqFn,
    )
  }

// TODO: custom select fn
const makeSub = (target: any, arg: any, selector: (arg: any) => any) => () => {
  throw new Error('sub is not implemented for select')
}

declare const NoArg: unique symbol

/**
 * Creates a predefined selector that tracks its atom dependencies.
 * Selectors will only be recalculated if at least one of their
 * dependencies has changed. They will never be notified when
 * irrelevant atoms change.
 *
 * Notice that just like with an atom, you can pass a
 * selector to `.get()` or `.use()`, which further allows you to
 * narrow down the value in your component, including using component state.
 * That second selector (called "inline selector") will be called
 * with the return value of the first selector (which is defined in the store)
 *
 * Usage:
 * ```ts
 * const { $ } = store(() => {
 *   const counter = atom(1)
 *   const double = select(() => counter.get() * 2)
 *   return { double }
 * })
 *
 * // in comparison to atoms, selects are functions that must be called.
 * $.double().get()
 * $.double().get(x => x * 2) // with an inline selector
 * $.double().use() // in a component
 * $.double().use(x => x * 2, [eqFn]) // in a component, with an inline selector
 * ```
 */
export const select = <TReturn, TArg = undefined>(
  selector: (arg: TArg) => TReturn,
  {
    dynamicDeps = false,
    set,
  }: {
    dynamicDeps?: boolean
    set?: (arg: TArg, value: TReturn) => void
  } = {},
) => {
  const store = getCurrentStore()

  const internals = makeInternals({
    type: 'select',
    depsList: undefined,
    dynamicDeps,
    setup: (name: string) => {
      internals.setPartialInternals({ name } as any)
    },
  })

  const target = attachObjToFn(
    (arg: any) => {
      return {
        get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
          makeGet(target as any, arg, selector)(...pass),

        set: (...pass: Parameters<ReturnType<typeof makeSet>>) =>
          makeSet(arg, set ?? identity)(...pass),

        use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
          makeUse(target as any, arg)(...pass),

        sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
          makeSub(target, arg, selector)(...pass),
      }
    },
    {
      ...(internals as {}),
    },
  )

  return target as any as Select<TArg, TReturn>
}
