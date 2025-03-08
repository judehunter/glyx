import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../misc/deps'
import { runCustomSelector } from '../misc/runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../misc/useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../misc/utils'

const makeGet =
  (target: any, args: any[], selector: (...args: any[]) => any) =>
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
  (target: any, args: any[]) =>
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

export const select = (selector: (...args: any[]) => any) => {
  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: (...pass: Parameters<ReturnType<typeof makeGet>>) =>
          makeGet(target, args, selector)(...pass),

        use: (...pass: Parameters<ReturnType<typeof makeUse>>) =>
          makeUse(target, args)(...pass),

        sub: (...pass: Parameters<ReturnType<typeof makeSub>>) =>
          makeSub(target, args, selector)(...pass),
      }
    },
    {
      _glyx: {
        type: 'select',
        depsList: undefined as undefined | string[],
      },
    },
  )

  return target
}
