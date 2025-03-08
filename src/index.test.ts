import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { atom, group, store } from '.'
import { act, renderHook } from '@testing-library/react'

test('atom set', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect($._glyxTest().stored.get('counter')).toBe(5)

  $.counter.set(10)

  expect($._glyxTest().stored.get('counter')).toBe(10)
})

test('atom sub', () => {
  const $ = store(() => {
    const counter = atom(0)

    return { counter }
  })

  const listener = vi.fn()

  $.counter.sub(listener)

  $.counter.set(1)

  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledWith(1)

  $.counter.set(5)

  expect(listener).toHaveBeenCalledTimes(2)
  expect(listener).toHaveBeenCalledWith(5)
})

test('atom use', () => {
  const $ = store(() => {
    const counter = atom(10)

    return { counter }
  })

  const spy = vi.fn()

  const { result, rerender } = renderHook(() => {
    const state = $.counter.use()
    spy(state)
    return state
  })

  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy.mock.lastCall?.[0]).toBe(10)

  act(() => {
    $.counter.set(20)
  })

  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy.mock.lastCall?.[0]).toBe(20)

  expect(result.current).toBe(20)
})

test('group', () => {
  const $ = store(() => {
    const canvas = group(() => {
      const nodeCount = atom(10)

      return { nodeCount }
    })

    return { canvas }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    'canvas.nodeCount': 10,
  })

  $.canvas.nodeCount.set(20)

  expect($._glyxTest().stored.getAll()).toEqual({
    'canvas.nodeCount': 20,
  })
})
