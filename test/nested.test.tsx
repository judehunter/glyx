import { describe, expect } from 'vitest'
import { test } from 'vitest'
import { store, atom, select, nested } from '../src/index'
import { assertWith, makeHookCallSpy } from './utils'
import { act } from 'react'
import { StoreInternals } from '../src/methods/store'

describe('nested on select', () => {
  test('select.get()', () => {
    const $ = store(() => {
      const counter = atom(5)

      const double = nested(
        select(() => counter.get() * 2),
        (double) => {
          const doubleAgain = select(() => double.get() * 2)

          const x = () => {}

          return { doubleAgain, x }
        },
      )

      return { counter, double }
    })

    assertWith<StoreInternals>($)

    expect($.double().get()).toBe(10)
    expect($.double().doubleAgain().get()).toBe(20)

    $.counter.set(10)
    $._glyx.getStored().flush()

    expect($.double().get()).toBe(20)
    expect($.double().doubleAgain().get()).toBe(40)
  })

  test('select.get() with args', () => {
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

    assertWith<StoreInternals>($)

    expect($.mult(10).get()).toBe(50)
    expect($.mult(10).add(10).get()).toBe(60)

    $.counter.set(10)
    $._glyx.getStored().flush()

    expect($.mult(10).get()).toBe(100)
    expect($.mult(10).add(10).get()).toBe(110)
  })

  test('select.use()', () => {
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

    assertWith<StoreInternals>($)

    const calls1 = makeHookCallSpy(() => $.double().use())
    const calls2 = makeHookCallSpy(() => $.double().doubleAgain().use())

    expect(calls1()).toEqual([[10]])
    expect(calls2()).toEqual([[20]])

    act(() => {
      $.counter.set(10)
      $._glyx.getStored().flush()
    })

    expect(calls1()).toEqual([[10], [20]])
    expect(calls2()).toEqual([[20], [40]])
  })
})

describe('nested on atom', () => {
  test('select.get()', () => {
    const $ = store(() => {
      const counter = nested(atom(5), (value) => {
        const double = select(() => value.get() * 2)

        return { double }
      })

      return { counter }
    })

    assertWith<StoreInternals>($)

    expect($.counter.get()).toBe(5)
    expect($.counter.double().get()).toBe(10)

    $.counter.set(10)
    $._glyx.getStored().flush()

    expect($.counter.get()).toBe(10)
    expect($.counter.double().get()).toBe(20)
  })

  test('select.use()', () => {
    const $ = store(() => {
      const counter = nested(atom(5), (value) => {
        const double = select(() => value.get() * 2)

        return { double }
      })

      return { counter }
    })

    assertWith<StoreInternals>($)

    const calls1 = makeHookCallSpy(() => $.counter.use())
    const calls2 = makeHookCallSpy(() => $.counter.double().use())

    expect(calls1()).toEqual([[5]])
    expect(calls2()).toEqual([[10]])

    act(() => {
      $.counter.set(10)
      $._glyx.getStored().flush()
    })

    expect(calls1()).toEqual([[5], [10]])
    expect(calls2()).toEqual([[10], [20]])
  })
})
