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

  expect($.multi(2).get()).toBe(40)
  expect($.multi(3).get()).toBe(60)
})

test('select.use() with selector args', () => {
  const $ = store(() => {
    const counter = atom(10)

    const multi = select((x) => counter.get() * x)

    return { counter, multi }
  })

  const spy = vi.fn()

  const hook = renderHook(() => {
    const state = $.multi(2).use()
    spy(state)
    return state
  })

  expect(spy.mock.calls).toEqual([[20]])
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

test('select get with custom select fn', () => {
  const $ = store(() => {
    const counter = atom(10)

    const mult = select((factor) => counter.get() * factor)

    return { counter, mult }
  })

  expect($.mult(2).get()).toBe(20)
  expect($.mult(2).get((x) => x + 5)).toBe(25)
})

test('select get with custom select fn: select another atom as well', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    const mult = select((factor) => a.get() * factor)

    return { a, b, mult }
  })

  expect($.mult(2).get()).toBe(20)
  expect($.mult(2).get((x) => x + 5 + $.b.get())).toBe(125)

  $.a.set(11)

  expect($.mult(2).get((x) => x + 5 + $.b.get())).toBe(127)
})

test('select use with custom select fn', () => {
  const $ = store(() => {
    const a = atom(10)

    const mult = select((factor) => a.get() * factor)

    return { a, mult }
  })

  const calls = makeHookCallSpy(() => $.mult(2).use((x) => x + 5))

  expect(calls()).toEqual([[25]])

  act(() => {
    $.a.set(11)
  })

  expect(calls()).toEqual([[25], [27]])
})

test('select use with custom select fn: select another atom as well', () => {
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
  })

  expect(calls()).toEqual([[120], [122]])

  act(() => {
    $.b.set(200)
  })

  expect(calls()).toEqual([[120], [122], [222]])
})
