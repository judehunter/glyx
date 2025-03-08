import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'
import React, { useState } from 'react'

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

test('zombie child', () => {
  const $ = store(() => {
    const elems = atom([10, 20])
    return { elems }
  })

  const spyChild0 = vi.fn()
  const spyChild1 = vi.fn()
  const spyParent = vi.fn()

  const Child = ({ idx }: { idx: number }) => {
    const elem = $.elems.use((x) => {
      const value = x[idx]
      if (value === undefined) {
        throw new Error('This should be handled by React')
      }
      return value
    })

    if (idx === 0) {
      spyChild0(elem)
    } else if (idx === 1) {
      spyChild1(elem)
    }

    return null
  }

  const Parent = () => {
    const elems = $.elems.use()
    spyParent(elems)
    return elems.map((elem, idx) => <Child idx={idx} key={elem} />)
  }

  render(<Parent />)

  expect(spyChild0.mock.calls).toEqual([[10]])
  expect(spyChild1.mock.calls).toEqual([[20]])
  expect(spyParent.mock.calls).toEqual([[[10, 20]]])

  act(() => {
    $.elems.set([11])
  })

  expect(spyChild0.mock.calls).toEqual([[10], [11]])
  expect(spyChild1.mock.calls).toEqual([[20]])
  expect(spyParent.mock.calls).toEqual([[[10, 20]], [[11]]])
})

test('select with custom select tracks deps of both independently')
test('updates are batched')
test('component unsubscribes')
test('no infinite loop')
test('custom selector as a closure (uses state from the component)')
// todo: .use on a group(), pick, etc.
