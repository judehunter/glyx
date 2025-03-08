import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

export const makeHookCallSpy = <T>(hook: () => T) => {
  const fn = vi.fn()
  renderHook(() => {
    const state = hook()
    fn(state)
    return state
  })
  return () => fn.mock.calls
}

export function assertWith<TWith>(obj: any): asserts obj is TWith {}

// todo: function that only returns "unchecked" calls of vi.fn() to avoid repetition
