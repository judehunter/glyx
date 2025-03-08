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
