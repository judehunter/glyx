import { expect } from 'vitest'
import { test } from 'vitest'
import { store, atom, select, nested } from '../src/index'

test('nested() select.get()', () => {
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

test('nested select.get() with args', () => {
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
