import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom } from '../src/index'
import { act, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'

test('atom.get() of initial value', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect($.counter.get()).toBe(5)
})

test('atom.set()', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect($._glyxTest().stored.get('counter')).toBe(5)

  $.counter.set(10)

  expect($._glyxTest().stored.get('counter')).toBe(10)
})

test.skip('atom.sub()', () => {
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

test('atom.use()', () => {
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

test('atom.get() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  expect($.a.get((x) => x + 5)).toBe(15)
})

test('atom.get() with custom selector that access another atom')

test('atom.use() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  const calls = makeHookCallSpy(() => $.a.use((x) => x + 5))

  expect(calls()).toEqual([[15]])

  act(() => {
    $.a.set(11)
  })

  expect(calls()).toEqual([[15], [16]])
})

test('atom.use() with custom selector that access another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    return { a, b }
  })

  const calls = makeHookCallSpy(() => $.a.use((x) => x + $.b.get()))

  expect(calls()).toEqual([[110]])

  act(() => {
    $.a.set(11)
  })

  expect(calls()).toEqual([[110], [111]])

  act(() => {
    $.b.set(200)
  })

  expect(calls()).toEqual([[110], [111], [211]])
})
