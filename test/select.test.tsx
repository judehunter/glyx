import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'
import React, { useState } from 'react'

test('select.get() with atom as dependency', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    return { counter, double }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    counter: 10,
  })

  expect($.double._glyx.depsList).toBeUndefined()

  expect($.double().get()).toBe(20)
  expect($.double._glyx.depsList).toEqual(['counter'])

  $.counter.set(20)
  $._glyxTest().stored.flush()

  expect($.double().get()).toBe(40)
})

test('select.get() with transitive dependency of another select', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    const quadruple = select(() => double().get() * 2)

    return { counter, double, quadruple }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    counter: 10,
  })

  expect($.double._glyx.depsList).toBeUndefined()
  expect($.quadruple._glyx.depsList).toBeUndefined()

  expect($.double().get()).toBe(20)

  expect($.double._glyx.depsList).toEqual(['counter'])
  expect($.quadruple._glyx.depsList).toBeUndefined()

  expect($.quadruple().get()).toBe(40)

  expect($.quadruple._glyx.depsList).toEqual(['counter'])
  expect($.quadruple._glyx.depsList).toEqual(['counter'])

  $.counter.set(20)
  $._glyxTest().stored.flush()

  expect($.double().get()).toBe(40)
  expect($.quadruple().get()).toBe(80)
})

test('select.use() with atom as dependency', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    return { counter, double }
  })

  const calls = makeHookCallSpy(() => $.double().use())

  expect(calls()).toEqual([[20]])

  act(() => {
    $.counter.set(20)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[20], [40]])
})

test('select.use() with transitive dependency of another select', () => {
  const $ = store(() => {
    const counter = atom(10)

    const double = select(() => counter.get() * 2)

    const quadruple = select(() => double().get() * 2)

    return { counter, double, quadruple }
  })

  const calls1 = makeHookCallSpy(() => $.double().use())
  const calls2 = makeHookCallSpy(() => $.quadruple().use())

  expect(calls1()).toEqual([[20]])
  expect(calls2()).toEqual([[40]])

  act(() => {
    $.counter.set(20)
    $._glyxTest().stored.flush()
  })

  expect(calls1()).toEqual([[20], [40]])
  expect(calls2()).toEqual([[40], [80]])
})

test('select.get() with selector args', () => {
  const $ = store(() => {
    const counter = atom(10)

    const multi = select((x) => counter.get() * x)

    return { counter, multi }
  })

  expect($.multi(2).get()).toBe(20)
  expect($.multi(3).get()).toBe(30)

  $.counter.set(20)
  $._glyxTest().stored.flush()

  expect($.multi(2).get()).toBe(40)
  expect($.multi(3).get()).toBe(60)
})

test('select.use() with selector args', () => {
  const $ = store(() => {
    const counter = atom(10)

    const multi = select((x) => counter.get() * x)

    return { counter, multi }
  })

  const calls = makeHookCallSpy(() => $.multi(2).use())

  act(() => {
    $.counter.set(20)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[20], [40]])
})

test('select.get() with two atoms as dependencies', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() + b.get())

    return { a, b, c }
  })

  expect($.c().get()).toBe(11)

  $.a.set(2)
  $._glyxTest().stored.flush()

  expect($.c().get()).toBe(12)

  $.b.set(20)
  $._glyxTest().stored.flush()

  expect($.c().get()).toBe(22)
})

test('select.use() with two atoms as dependencies', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() + b.get())

    return { a, b, c }
  })

  const calls = makeHookCallSpy(() => $.c().use())

  expect(calls()).toEqual([[11]])

  act(() => {
    $.a.set(2)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[11], [12]])

  act(() => {
    $.b.set(20)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[11], [12], [22]])
})

test('select.get() with custom selector', () => {
  const $ = store(() => {
    const counter = atom(10)

    const mult = select((factor) => counter.get() * factor)

    return { counter, mult }
  })

  expect($.mult(2).get()).toBe(20)
  expect($.mult(2).get((x) => x + 5)).toBe(25)
})

test('select.get() with custom selector that accesses another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    const mult = select((factor) => a.get() * factor)

    return { a, b, mult }
  })

  expect($.mult(2).get()).toBe(20)
  expect($.mult(2).get((x) => x + 5 + $.b.get())).toBe(125)

  $.a.set(11)
  $._glyxTest().stored.flush()

  expect($.mult(2).get((x) => x + 5 + $.b.get())).toBe(127)
})

test('select.use() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    const mult = select((factor) => a.get() * factor)

    return { a, mult }
  })

  const calls = makeHookCallSpy(() => $.mult(2).use((x) => x + 5))

  expect(calls()).toEqual([[25]])

  act(() => {
    $.a.set(11)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[25], [27]])
})

test('select.use() with custom selector that accesses another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    const mult = select((factor) => a.get() * factor)

    return { a, b, mult }
  })

  const calls = makeHookCallSpy(() => $.mult(2).use((x) => x + $.b.get()))

  expect(calls()).toEqual([[120]])

  act(() => {
    $.a.set(11)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[120], [122]])

  act(() => {
    $.b.set(200)
    $._glyxTest().stored.flush()
  })

  expect(calls()).toEqual([[120], [122], [222]])
})

test('select.use() tracks deps of selector and custom selector independently', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() * 2)

    return { a, b, c }
  })

  const c = $.c()

  const calls1 = makeHookCallSpy(() => c.use())
  const calls2 = makeHookCallSpy(() => c.use((x) => x + $.b.get()))

  expect(calls1()).toEqual([[2]])
  expect(calls2()).toEqual([[12]])

  act(() => {
    $.a.set(2)
    $._glyxTest().stored.flush()
  })

  expect(calls1()).toEqual([[2], [4]])
  expect(calls2()).toEqual([[12], [14]])

  act(() => {
    $.b.set(20)
    $._glyxTest().stored.flush()
  })

  expect(calls1()).toEqual([[2], [4]])
  expect(calls2()).toEqual([[12], [14], [24]])
})

test('select.use() with variable selector args from component state', () => {
  const $ = store(() => {
    const a = atom(1)

    const mult = select((factor) => a.get() * factor)

    return { a, mult }
  })

  const spy = vi.fn()

  const Comp = ({ factor }: { factor: number }) => {
    const mult = $.mult(factor).use()

    spy(mult)

    return null
  }

  const { rerender } = render(<Comp factor={2} />)

  expect(spy.mock.calls).toEqual([[2]])

  rerender(<Comp factor={3} />)

  expect(spy.mock.calls).toEqual([[2], [3]])
})

test('select.use() with custom selector closing over component state', () => {
  const $ = store(() => {
    const a = atom(1)

    const plusOne = select(() => a.get() + 1)

    return { a, plusOne }
  })

  $.plusOne().

  const spy = vi.fn()

  const Comp = ({ factor }: { factor: number }) => {
    const val = $.plusOne().use((x) => x * factor)

    spy(val)

    return null
  }

  const { rerender } = render(<Comp factor={2} />)

  expect(spy.mock.calls).toEqual([[4]])

  rerender(<Comp factor={3} />)

  expect(spy.mock.calls).toEqual([[4], [6]])
})

test('select with args doesnt rerun deps tracking')
