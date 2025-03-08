import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../misc/deps'
import { runInlineSelector } from '../misc/runInlineSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../misc/utils'
import { getCurrentStore } from '../misc/currentStore'
import { MakeInternals, makeInternals } from '../misc/makeInternals'
import { pubsub } from '../misc/pubsub'

export type CalledSelect<TSelected = unknown, TNested = {}> = {
  get<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  use<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  sub(listener: (value: TSelected) => void): () => void
} & TNested

export type Select<TParams extends any[], TReturn> = (
  ...args: TParams
) => CalledSelect<TReturn>

export type SelectInternals = MakeInternals<{
  type: 'select'
  name: string
  depsList: undefined | string[]
  dynamicDeps: boolean
  setup: (name: string) => void
  // // supplied by store:
  //  // note: name is not actually used for anything yet
  // getAll(): Record<string, unknown>
  // subWithDeps: (
  //   deps: string[],
  //   listener: (value: unknown) => void,
  // ) => () => void
}>

// export type SelectBrand = (...args: any[]) => Brand<'select'>

const makeGet =
  (
    target: Select<any, any> & SelectInternals,
    args: any[],
    selector: (...args: any[]) => any,
  ) =>
  (customSelector?: (...args: any[]) => any) => {
    const targetInternals = target.getInternals()
    const { value: selectedValue, depsList } = callAndTrackDeps(
      {
        trackDeps: !targetInternals.depsList && !targetInternals.dynamicDeps,
      },
      () => selector(...args),
    )
    if (target.getInternals().depsList === undefined) {
      target.setPartialInternals({ depsList })
    }

    // todo: add error handling and cleanup of deps on error
    const value = (customSelector ?? identity)(selectedValue)

    return value
  }

const makeUse =
  (target: Select<any, any> & SelectInternals, args: any[]) =>
  (
    inlineSelector?: (...args: any[]) => any,
    eqFn?: (a: any, b: any) => boolean,
  ) => {
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
              (inlineSelector ?? identity)(target(...args).get()),
            inlineSelectorDepsRef,
            value: undefined,
          })
        }
        const value = target(...args).get()

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
const makeSub =
  (target: any, args: any[], selector: (...args: any[]) => any) => () => {
    throw new Error('sub is not implemented for select')
  }

const makeWith = (target: any) => (apply: (atom: any) => any) => {
  return apply(target)
}

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
 * const $ = store(() => {
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
 *
 * Currently, selects do not support set methods.
 */
export const select = <TParams extends any[], TReturn>(
  selector: (...args: TParams) => TReturn,
  { dynamicDeps = false }: { dynamicDeps?: boolean } = {},
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
    (...args: any[]) => {
      return {
        get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
          makeGet(target as any, args, selector)(...pass),

        use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
          makeUse(target as any, args)(...pass),

        sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
          makeSub(target, args, selector)(...pass),
      }
    },
    {
      ...(internals as {}),
    },
  )

  return target as any as Select<TParams, TReturn>
}
