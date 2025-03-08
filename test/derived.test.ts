import { expect, test } from 'vitest'
import { atom, derived, select, store } from '../src/index'
import { makeHookCallSpy } from './utils'
import { act } from '@testing-library/react'

test('derived.get()', () => {
  const $ = store(() => {
    const count = atom(1)
    const double = derived(() => count.get() * 2)

    return { count, double }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    count: 1,
    double: 2,
  })

  expect($.count.get()).toEqual(1)
  expect($.double.get()).toEqual(2)

  $.count.set(2)

  expect($._glyxTest().stored.getAll()).toEqual({
    count: 2,
    double: 4,
  })

  expect($.count.get()).toEqual(2)
  expect($.double.get()).toEqual(4)
})

test('derived.use()', () => {
  const $ = store(() => {
    const count = atom(1)
    const double = derived(() => count.get() * 2)

    return { count, double }
  })

  const calls = makeHookCallSpy(() => $.double.use())

  expect(calls()).toEqual([[2]])

  act(() => {
    $.count.set(2)
  })

  expect(calls()).toEqual([[2], [4]])
})

test('derived.use() on two atoms', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)
    const sum = derived(() => a.get() + b.get())

    return { a, b, sum }
  })

  const calls = makeHookCallSpy(() => $.sum.use())

  expect(calls()).toEqual([[3]])

  act(() => {
    $.a.set(10)
  })

  expect(calls()).toEqual([[3], [12]])

  act(() => {
    $.b.set(20)
  })

  expect(calls()).toEqual([[3], [12], [30]])
})

test('derived.use() on a derived', () => {
  const $ = store(() => {
    const a = atom(1)
    const double = derived(() => a.get() * 2)
    const quadruple = derived(() => double.get() * 2)

    return { a, double, quadruple }
  })

  const calls = makeHookCallSpy(() => $.quadruple.use())

  expect(calls()).toEqual([[4]])

  act(() => {
    $.a.set(10)
  })

  expect(calls()).toEqual([[4], [40]])
})

test('derived.use() on a select', () => {
  const $ = store(() => {
    const a = atom(1)
    const double = select(() => a.get() * 2)
    const quadruple = derived(() => double().get() * 2)

    return { a, double, quadruple }
  })

  const calls = makeHookCallSpy(() => $.quadruple.use())

  expect(calls()).toEqual([[4]])

  act(() => {
    $.a.set(10)
  })

  expect(calls()).toEqual([[4], [40]])
})
