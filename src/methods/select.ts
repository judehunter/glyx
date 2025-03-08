import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../misc/deps'
import { runCustomSelector } from '../misc/runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../misc/utils'

export declare const _glyxSelect: unique symbol

export type CalledSelect<TSelected = unknown, TNested = {}> = {
  get<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  use<TCustomSelected = TSelected>(
    customSelector?: (value: TSelected) => TCustomSelected,
  ): TCustomSelected
  sub(listener: (value: TSelected) => void): () => void
} & TNested & { [_glyxSelect]: void }

export type Select<TParams extends any[], TReturn> = (
  ...args: TParams
) => CalledSelect<TReturn>

export type SelectInternals = {
  _glyx: {
    type: 'select'
    depsList: undefined | string[]
    // supplied by store:
    name: string // note: name is not actually used for anything yet
    getAll(): Record<string, unknown>
    subWithDeps: (
      deps: string[],
      listener: (value: unknown) => void,
    ) => () => void
  }
}

const makeGet =
  (
    target: Select<any, any> & SelectInternals,
    args: any[],
    selector: (...args: any[]) => any,
  ) =>
  (customSelector?: (...args: any[]) => any) => {
    const { value: selectedValue, depsList } = callAndTrackDeps(
      { trackDeps: !target._glyx.depsList },
      () => selector(...args),
    )
    target._glyx.depsList ??= depsList

    // todo: add error handling and cleanup of deps on error
    const value = (customSelector ?? identity)(selectedValue)

    return value
  }

const makeUse =
  (target: Select<any, any> & SelectInternals, args: any[]) =>
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
        if (!target._glyx.depsList) {
          throw new Error('depsList is undefined')
        }

        return target._glyx.subWithDeps(
          uniqueDeps(target._glyx.depsList, customSelectorDepsRef.current),
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
      target._glyx.getAll,
      target._glyx.getAll,
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
  (target: any, args: any[], selector: (...args: any[]) => any) => () => {
    throw new Error('sub is not implemented for select')
  }

export const select = <TParams extends any[], TReturn>(
  selector: (...args: TParams) => TReturn,
) => {
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
      _glyx: {
        type: 'select',
      } as SelectInternals['_glyx'],
    },
  )

  return target as any as Select<TParams, TReturn>
}
