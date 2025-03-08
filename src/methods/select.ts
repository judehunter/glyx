import { useRef, useMemo } from 'react'
import { callAndTrackDeps } from '../deps'
import { runCustomSelector } from '../runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../useSyncExternalStoreWithSelector'
import { attachObjToFn, identity, uniqueDeps } from '../utils'

export const select = (selector: (...args: any[]) => any) => {
  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: (customSelector?: (...args: any[]) => any) => {
          const { value: selectedValue, depsList } = callAndTrackDeps(
            { trackDeps: !target._glyx.depsList },
            () => selector(...args),
          )
          target._glyx.depsList ??= depsList

          // todo: add error handling and cleanup of deps on error
          const value = (customSelector ?? identity)(selectedValue)

          return value
        },
        use: (customSelector?: (...args: any[]) => any) => {
          const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

          const subscribe = useMemo(
            () => (listener) => {
              if (!customSelectorDepsRef.current) {
                throw new Error('customSelectorDepsRef.current is undefined')
              }

              return target._glyx.subWithDeps(
                uniqueDeps(
                  target._glyx.depsList,
                  customSelectorDepsRef.current,
                ),
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
          )
        },
        // TODO: custom select fn
        sub: () => {
          if (!target._glyx.depsList) {
            target(...args).get()
          }
          return target._glyx.subWithDeps(...args)
        },
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
