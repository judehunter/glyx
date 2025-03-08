import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../misc/deps'
import { runCustomSelector } from '../misc/runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../misc/utils'
import { Brand } from '../misc/brand'
import { CurrentStore, getCurrentStore } from '../misc/currentStore'
import { assertWith } from '../../test/utils'
import { MakeInternals, makeInternals } from '../misc/makeInternals'

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
    store: CurrentStore,
  ) =>
  (customSelector?: (...args: any[]) => any) => {
    const { value: selectedValue, depsList } = callAndTrackDeps(
      { trackDeps: !target.getInternals().depsList },
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
  (
    target: Select<any, any> & SelectInternals,
    args: any[],
    store: CurrentStore,
  ) =>
  (
    customSelector?: (...args: any[]) => any,
    eqFn?: (a: any, b: any) => boolean,
  ) => {
    const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

    const subscribe = useMemo(
      () => (listener) => {
        if (!customSelectorDepsRef.current) {
          throw new Error('customSelectorDepsRef.current is undefined')
        }
        const depsList = target.getInternals().depsList
        if (!depsList) {
          throw new Error('depsList is undefined')
        }

        return store.handles.subKeys(
          uniqueDeps(depsList, customSelectorDepsRef.current),
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
      store.handles.getAll,
      store.handles.getAll,
      () => {
        const value = target(...args).get()

        return runCustomSelector({
          customSelector,
          customSelectorDepsRef,
          value,
        })
      },
      eqFn,
    )
  }

// TODO: custom select fn
const makeSub =
  (
    target: any,
    args: any[],
    selector: (...args: any[]) => any,
    store: CurrentStore,
  ) =>
  () => {
    throw new Error('sub is not implemented for select')
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
) => {
  const store = getCurrentStore()

  const internals = makeInternals({
    type: 'select',
    depsList: undefined,
    setup: (name: string) => {
      internals.setPartialInternals({ name } as any)
    },
  })

  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
          makeGet(target as any, args, selector, store)(...pass),

        use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
          makeUse(target as any, args, store)(...pass),

        sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
          makeSub(target, args, selector, store)(...pass),
      }
    },
    {
      ...(internals as {}),
    },
  )

  return target as any as Select<TParams, TReturn>
}
