import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { atom, group, nested, select, store } from '.'
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

test('nested group', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = group(() => {
      const c = atom(2)

      const d = group(() => {
        const e = atom(3)

        return { e }
      })

      return { c, d }
    })

    return { a, b }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    a: 1,
    'b.c': 2,
    'b.d.e': 3,
  })

  $.a.set(4)
  $.b.c.set(5)
  $.b.d.e.set(6)

  expect($._glyxTest().stored.getAll()).toEqual({
    a: 4,
    'b.c': 5,
    'b.d.e': 6,
  })
})

test('select get with deps', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    return { counter, double }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    counter: 10,
  })

  expect($.double._glyx.tracksDeps).toBe(false)

  expect($.double().get()).toBe(20)
  expect($.double._glyx.tracksDeps).toBe(true)
  expect($.double._glyx.depsList).toEqual(['counter'])

  $.counter.set(20)

  expect($.double().get()).toBe(40)
})

test('select get transitive', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    const quadruple = select(() => double().get() * 2)

    return { counter, double, quadruple }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    counter: 10,
  })

  expect($.double._glyx.tracksDeps).toBe(false)
  expect($.quadruple._glyx.tracksDeps).toBe(false)
  expect($.double().get()).toBe(20)
  expect($.double._glyx.tracksDeps).toBe(true)
  expect($.double._glyx.depsList).toEqual(['counter'])
  expect($.quadruple().get()).toBe(40)
  expect($.quadruple._glyx.tracksDeps).toBe(true)
  expect($.quadruple._glyx.depsList).toEqual(['counter'])

  $.counter.set(20)

  expect($.double().get()).toBe(40)
  expect($.quadruple().get()).toBe(80)
})

test('select use with deps', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    return { counter, double }
  })

  const spy = vi.fn()

  const { result, rerender } = renderHook(() => {
    const state = $.double().use()
    spy(state)
    return state
  })

  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy.mock.lastCall?.[0]).toBe(20)

  act(() => {
    $.counter.set(20)
  })

  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy.mock.lastCall?.[0]).toBe(40)

  expect(result.current).toBe(40)
})

test('select use transitive', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    const quadruple = select(() => double().get() * 2)

    return { counter, double, quadruple }
  })

  const spy1 = vi.fn()
  const spy2 = vi.fn()

  const hook1 = renderHook(() => {
    const state = $.double().use()
    spy1(state)
    return state
  })

  const hook2 = renderHook(() => {
    const state = $.quadruple().use()
    spy2(state)
    return state
  })

  expect(spy1).toHaveBeenCalledTimes(1)
  expect(spy1.mock.lastCall?.[0]).toBe(20)
  expect(spy2).toHaveBeenCalledTimes(1)
  expect(spy2.mock.lastCall?.[0]).toBe(40)

  act(() => {
    $.counter.set(20)
  })

  expect(spy1).toHaveBeenCalledTimes(2)
  expect(spy1.mock.lastCall?.[0]).toBe(40)
  expect(spy2).toHaveBeenCalledTimes(2)
  expect(spy2.mock.lastCall?.[0]).toBe(80)

  expect(hook1.result.current).toBe(40)
  expect(hook2.result.current).toBe(80)
})

test('select get with args', () => {
  const $ = store(() => {
    const counter = atom(10)

    const multi = select((x) => counter.get() * x)

    return { counter, multi }
  })

  expect($.multi(2).get()).toBe(20)
  expect($.multi(3).get()).toBe(30)

  $.counter.set(20)

  expect($.multi(2).get()).toBe(40)
  expect($.multi(3).get()).toBe(60)
})

test('nested select', () => {
  const $ = store(() => {
    const counter = atom(5)

    const double = nested(
      select(() => counter.get() * 2),
      (double) => {
        const doubleAgain = select(() => double.get() * 2)

        return { doubleAgain }
      },
    )

    return { counter, double }
  })

  expect($.double().get()).toBe(10)
  expect($.double().doubleAgain().get()).toBe(20)

  $.counter.set(10)

  expect($.double().get()).toBe(20)
  expect($.double().doubleAgain().get()).toBe(40)
})

test('nested select with args', () => {
  const $ = store(() => {
    const counter = atom(5)

    const mult = nested(
      select((factor) => counter.get() * factor),
      (mult) => {
        const add = select((num) => mult.get() + num)

        return { add }
      },
    )

    return { counter, mult }
  })

  expect($.mult(10).get()).toBe(50)
  expect($.mult(10).add(10).get()).toBe(60)

  $.counter.set(10)

  expect($.mult(10).get()).toBe(100)
  expect($.mult(10).add(10).get()).toBe(110)
})

test('select two atoms at once', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() + b.get())

    return { a, b, c }
  })

  expect($.c().get()).toBe(11)

  $.a.set(2)

  expect($.c().get()).toBe(12)

  $.b.set(20)

  expect($.c().get()).toBe(22)
})

test('isolated updates with deps tracking', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() + b.get())

    return { a, b, c }
  })

  const spy1 = vi.fn()
  const spy2 = vi.fn()
  const spy3 = vi.fn()

  const hook1 = renderHook(() => {
    const state = $.a.use()
    spy1(state)
    return state
  })

  const hook2 = renderHook(() => {
    const state = $.b.use()
    spy2(state)
    return state
  })

  const hook3 = renderHook(() => {
    const state = $.c().use()
    spy3(state)
    return state
  })

  expect(spy1.mock.calls).toEqual([[1]])
  expect(spy2.mock.calls).toEqual([[10]])
  expect(spy3.mock.calls).toEqual([[11]])

  act(() => {
    $.a.set(2)
  })

  expect(spy1.mock.calls).toEqual([[1], [2]])
  expect(spy2.mock.calls).toEqual([[10]])
  expect(spy3.mock.calls).toEqual([[11], [12]])

  act(() => {
    $.b.set(20)
  })

  expect(spy1.mock.calls).toEqual([[1], [2]])
  expect(spy2.mock.calls).toEqual([[10], [20]])
  expect(spy3.mock.calls).toEqual([[11], [12], [22]])
})
