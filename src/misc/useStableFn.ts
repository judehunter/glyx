/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef } from 'react'

/**
 * https://github.com/alibaba/hooks (MIT)
 */
export const useStableFn = <T extends (...args: any[]) => any>(fn: T) => {
  const fnRef = useRef<T>(fn)

  // why not write `fnRef.current = fn`?
  // https://github.com/alibaba/hooks/issues/728
  fnRef.current = useMemo<T>(() => fn, [fn])

  const memoizedFn = useRef<unknown>(undefined)
  if (!memoizedFn.current) {
    memoizedFn.current = function (this, ...args) {
      return fnRef.current.apply(this, args)
    }
  }

  return memoizedFn.current as T
}
