import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'
import React, { useState } from 'react'
import { StoreInternals } from '../src/methods/store'
import { DEPS_LIST, TRACKING_DEPS } from '../src/misc/deps'
import { AtomInternals } from '../src/methods/atom'
import { SelectInternals } from '../src/methods/select'
import { pubsub } from '../src/misc/pubsub'
import { assertWith } from '../src/misc/utils'

test('isolated updates with dependency tracking', () => {
  const { $ } = store(() => {
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
    pubsub.flush()
  })

  expect(calls1()).toEqual([[1], [2]])
  expect(calls2()).toEqual([[10]])
  expect(calls3()).toEqual([[11], [12]])

  act(() => {
    $.b.set(20)
    pubsub.flush()
  })

  expect(calls1()).toEqual([[1], [2]])
  expect(calls2()).toEqual([[10], [20]])
  expect(calls3()).toEqual([[11], [12], [22]])
})

test('no zombie child problem', () => {
  const { $ } = store(() => {
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
    pubsub.flush()
  })

  expect(spyChild0.mock.calls).toEqual([[10], [11]])
  expect(spyChild1.mock.calls).toEqual([[20]])
  expect(spyParent.mock.calls).toEqual([[[10, 20]], [[11]]])
})

test('no infinite loop with custom selector that returns an unstable reference', () => {
  const { $ } = store(() => {
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
    pubsub.flush()
  })

  expect(calls1()).toEqual([[{ x: 1 }], [{ x: 2 }]])
  expect(calls2()).toEqual([[{ x: 2 }], [{ x: 3 }]])
})

test('component unsubscribes', () => {
  const { $ } = store(() => {
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

  const x = pubsub
  expect(pubsub.getListeners()['$.a']).toHaveLength(2)

  unmount()

  expect(pubsub.getListeners()['$.a']).toHaveLength(0)
})

// this is handled by React, not Glyx
test('updates are batched', () => {
  const { $ } = store(() => {
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
    pubsub.flush()
  })

  expect(calls()).toEqual([[3], [7]])
})

test('action inside store', () => {
  const { $ } = store(() => {
    const a = atom(1)
    const increment = () => a.set(a.get() + 1)
    return { a, increment }
  })

  const calls = makeHookCallSpy(() => $.a.use())

  expect(calls()).toEqual([[1]])

  act(() => {
    $.increment()
    pubsub.flush()
  })

  expect(calls()).toEqual([[1], [2]])
})

test('selectors are not called when something else updates', () => {
  const { $ } = store(() => {
    const a = atom(1)
    const b = atom(2)
    return { a, b }
  })

  const spy = vi.fn()
  const calls = makeHookCallSpy(() =>
    $.a.use((x) => {
      spy(x)
      return x
    }),
  )

  expect(calls()).toEqual([[1]])

  act(() => {
    $.b.set(3)
    pubsub.flush()
  })

  expect(calls()).toEqual([[1]])
})

test('select fails gracefully on error thrown in selector', () => {
  const { $ } = store(() => {
    const a = atom(1)
    const b = select((shouldThrow: boolean) => {
      if (shouldThrow) {
        throw new Error('test')
      }
      return a.get()
    })

    return { a, b }
  })

  assertWith<SelectInternals>($.b)

  expect(() => $.b(true).get()).toThrow('test')
  expect(TRACKING_DEPS).toBe(false)
  expect(DEPS_LIST).toEqual([])

  expect($.b.getInternals().depsList).toBeUndefined()

  expect(() => $.b(false).get()).not.toThrow()
  expect(TRACKING_DEPS).toBe(false)
  expect(DEPS_LIST).toEqual([])
  expect($.b.getInternals().depsList).toEqual(['$.a'])
})

// declare const map: any
test('advanced use case', () => {
  const { $ } = store(() => {
    const $user = group(() => {
      const user = atom({ name: 'John' })
      const loginError = atom<Error | undefined>(undefined)
      const userError = atom<Error | undefined>(undefined)

      return { user, loginError, userError }
    })

    const $canvas = group(() => {
      const nodes = atom([{ id: '1' }, { id: '2' }])
      const edges = atom([{ id: '1', source: '1', target: '2' }])

      return { nodes, edges }
    })

    return { $user, $canvas }
  })

  const calls = makeHookCallSpy(() => $.$canvas.pick(['edges', 'nodes']).use())

  expect(calls()).toEqual([
    [
      {
        edges: [{ id: '1', source: '1', target: '2' }],
        nodes: [{ id: '1' }, { id: '2' }],
      },
    ],
  ])

  act(() => {
    $.$canvas.nodes.set([])
    $.$canvas.edges.set([])
    pubsub.flush()
  })

  expect(calls()).toEqual([
    [
      {
        edges: [{ id: '1', source: '1', target: '2' }],
        nodes: [{ id: '1' }, { id: '2' }],
      },
    ],
    [
      {
        edges: [],
        nodes: [],
      },
    ],
  ])

  // $.pick()
})

// todo: select selector gets another select selector and tracks deps correctly (should work already since only the first select will start tracking deps at that point)

test('works without flushing', async () => {
  const { $ } = store(() => {
    const a = atom(1)
    return { a }
  })

  const calls = makeHookCallSpy(() => $.a.use())

  expect(calls()).toEqual([[1]])

  await act(async () => {
    $.a.set(2)

    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  expect(calls()).toEqual([[1], [2]])
})
