import { useRef, useMemo } from 'react'
import { pushToDepsListIfTracking } from '../deps'
import { runCustomSelector } from '../runCustomSelector'
import { useSyncExternalStoreWithSelector } from '../useSyncExternalStoreWithSelector'
import { identity, uniqueDeps } from '../utils'

export const atom = (initialValue: any) => {
  const target = {
    _glyx: { type: 'atom', initialValue },
    get: (customSelector?: (...args: any[]) => any) => {
      pushToDepsListIfTracking(target._glyx.name)

      const value = (customSelector ?? identity)(target._glyx.get())
      return value
    },
    use: (
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
      )
    },
    // sub: () => {
    //   return target._glyx.sub()
    // },
    set: (value: any) => {
      target._glyx.set(value)
    },
  }

  return target
}
