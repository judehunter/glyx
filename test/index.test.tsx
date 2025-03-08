import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'
import React, { useState } from 'react'

test('isolated updates with dependency tracking', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(10)

    const c = select(() => a.get() + b.get())

    return { a, b, c }
  })

  const calls1 = makeHookCallSpy(() => $.a.use())
  const calls2 = makeHookCallSpy(() => $.b.use())
  const calls3 = makeHookCallSpy(() => $.c().use())

  expect(calls1()).toEqual([[1]])
  expect(calls2()).toEqual([[10]])
  expect(calls3()).toEqual([[11]])

  act(() => {
    $.a.set(2)
  })

  expect(calls1()).toEqual([[1], [2]])
  expect(calls2()).toEqual([[10]])
  expect(calls3()).toEqual([[11], [12]])

  act(() => {
    $.b.set(20)
  })

  expect(calls1()).toEqual([[1], [2]])
  expect(calls2()).toEqual([[10], [20]])
  expect(calls3()).toEqual([[11], [12], [22]])
})

test('no zombie child problem', () => {
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

test('no infinite loop with custom selector that returns an unstable reference', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = select(() => a.get() + 1)

    return { a, b }
  })

  const calls1 = makeHookCallSpy(() => $.a.use((x) => ({ x })))
  const calls2 = makeHookCallSpy(() => $.b().use((x) => ({ x })))

  expect(calls1()).toEqual([[{ x: 1 }]])
  expect(calls2()).toEqual([[{ x: 2 }]])

  act(() => {
    $.a.set(2)
  })

  expect(calls1()).toEqual([[{ x: 1 }], [{ x: 2 }]])
  expect(calls2()).toEqual([[{ x: 2 }], [{ x: 3 }]])
})

test('component unsubscribes', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = select(() => a.get() + 1)
    return { a, b }
  })

  const Comp = () => {
    $.a.use()
    $.b().use()
    return null
  }

  const { unmount } = render(<Comp />)

  expect($._glyxTest().stored.getListeners().a).toHaveLength(2)

  unmount()

  expect($._glyxTest().stored.getListeners().a).toHaveLength(0)
})

// this is handled by React, not Glyx
test('updates are batched', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)
    const c = select(() => a.get() + b.get())
    return { a, b, c }
  })

  const calls = makeHookCallSpy(() => $.c().use())

  expect(calls()).toEqual([[3]])

  act(() => {
    $.a.set(3)
    $.b.set(4)
  })

  expect(calls()).toEqual([[3], [7]])
})

// todo: select selector gets another select selector and tracks deps correctly (should work already since only the first select will start tracking deps at that point)
