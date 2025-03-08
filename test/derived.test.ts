import { expect, test, vi } from 'vitest'
import { atom, derived, select, store } from '../src/index'
import { assertWith, makeHookCallSpy } from './utils'
import { act } from '@testing-library/react'
import { StoreInternals } from '../src/methods/store'

test('derived.get()', () => {
  const $ = store(() => {
    const count = atom(1)
    const double = derived(() => count.get() * 2)

    return { count, double }
  })

  assertWith<StoreInternals>($)

  expect($._glyx.getStored().getAll()).toEqual({
    count: 1,
    double: 2,
  })

  expect($.count.get()).toEqual(1)
  expect($.double.get()).toEqual(2)

  $.count.set(2)
  $._glyx.getStored().flush()

  expect($._glyx.getStored().getAll()).toEqual({
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

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.double.use())

  expect(calls()).toEqual([[2]])

  act(() => {
    $.count.set(2)
    $._glyx.getStored().flush()
  })

  expect(calls()).toEqual([[2], [4]])
})

test.only('derived.use() on two atoms', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)
    const sum = derived(() => a.get() + b.get())

    return { a, b, sum }
  })

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.sum.use())

  expect(calls()).toEqual([[3]])

  act(() => {
    $.a.set(10)
    $._glyx.getStored().flush()
  })

  expect(calls()).toEqual([[3], [12]])

  act(() => {
    $.b.set(20)
    $._glyx.getStored().flush()
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

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.quadruple.use())

  expect(calls()).toEqual([[4]])

  act(() => {
    $.a.set(10)
    $._glyx.getStored().flush()
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

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.quadruple.use())

  expect(calls()).toEqual([[4]])

  act(() => {
    $.a.set(10)
    $._glyx.getStored().flush()
  })

  expect(calls()).toEqual([[4], [40]])
})

test('dependency list does not include the atoms that derived atoms are derived from', () => {
  const $ = store(() => {
    const a = atom(1)
    const double = derived(() => a.get() * 2)
    const quadruple = select(() => double.get() * 2)

    return { a, double, quadruple }
  })

  const quadruple = $.quadruple().get()

  // todo
})

test('derived function is called once even when two deps change', async () => {
  const spy = vi.fn()

  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)
    const sum = derived(() => {
      const value = a.get() + b.get()
      spy(value)
      return value
    })

    return { a, b, sum }
  })

  assertWith<StoreInternals>($)

  expect(spy.mock.calls).toEqual([[3]])

  act(() => {
    $.a.set(10)
    $.b.set(20)
    $._glyx.getStored().flush()
  })

  // await new Promise((resolve) => setTimeout(resolve, 0))

  expect(spy.mock.calls).toEqual([[3], [30]])
})
