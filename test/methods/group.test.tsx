import { expect } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select } from '../../src/index'
import { act } from '@testing-library/react'
import { makeHookCallSpy } from '../utils'
import { Group } from '../../src/methods/group'
import { pubsub } from '../../src/misc/pubsub'

test('group with nested atom', () => {
  const $ = store(() => {
    const canvas = group(() => {
      const nodeCount = atom(10)

      return { nodeCount }
    })

    return { canvas }
  })

  expect(pubsub.getAll()).toEqual({
    '$.canvas.nodeCount': 10,
  })

  $.canvas.nodeCount.set(20)
  pubsub.flush()

  expect(pubsub.getAll()).toEqual({
    '$.canvas.nodeCount': 20,
  })
})

test('nested groups with atoms', () => {
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

  expect(pubsub.getAll()).toEqual({
    '$.a': 1,
    '$.b.c': 2,
    '$.b.d.e': 3,
  })

  $.a.set(4)
  $.b.c.set(5)
  $.b.d.e.set(6)
  pubsub.flush()

  expect(pubsub.getAll()).toEqual({
    '$.a': 4,
    '$.b.c': 5,
    '$.b.d.e': 6,
  })
})

test('group.pick() is fine-grained', () => {
  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(2)

      return { a, b }
    })

    return { $group }
  })

  const calls = makeHookCallSpy(() => $.$group.pick(['a']).use())

  expect(calls()).toEqual([[{ a: 1 }]])

  act(() => {
    $.$group.a.set(3)
    pubsub.flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])

  act(() => {
    $.$group.b.set(4)
    pubsub.flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])
})

test('separate group.pick() calls on the same group have separate deps', () => {
  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(2)

      return { a, b }
    })

    return { $group }
  })

  const calls1 = makeHookCallSpy(() => $.$group.pick(['a']).use())
  const calls2 = makeHookCallSpy(() => $.$group.pick(['b']).use())

  expect(calls1()).toEqual([[{ a: 1 }]])
  expect(calls2()).toEqual([[{ b: 2 }]])

  act(() => {
    $.$group.a.set(3)
    pubsub.flush()
  })

  expect(calls1()).toEqual([[{ a: 1 }], [{ a: 3 }]])
  expect(calls2()).toEqual([[{ b: 2 }]])

  act(() => {
    $.$group.b.set(4)
    pubsub.flush()
  })

  expect(calls1()).toEqual([[{ a: 1 }], [{ a: 3 }]])
  expect(calls2()).toEqual([[{ b: 2 }], [{ b: 4 }]])
})

test('store.pick()', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)

    return { a, b }
  })

  const calls = makeHookCallSpy(() => $.pick(['a']).use())

  expect(calls()).toEqual([[{ a: 1 }]])

  act(() => {
    $.a.set(3)
    pubsub.flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])

  act(() => {
    $.b.set(4)
    pubsub.flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])
})

test('group.with() middleware on all atoms', () => {
  const plusOneAllAtoms = <T extends Group<Record<string, any>>>(group: T) => {
    for (const key of Object.keys(group)) {
      const value = group[key]
      if (value.getInternals?.().type === 'atom') {
        const set = value.set
        value.set = (value) => {
          set(value + 1)
        }
      }
    }
    return group as T
  }

  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(1)
      return { a, b }
    }).with(plusOneAllAtoms)

    return { $group }
  })

  expect($.$group.a.get()).toBe(1)
  expect($.$group.b.get()).toBe(1)

  $.$group.a.set(2)
  pubsub.flush()

  expect($.$group.a.get()).toBe(3)
  expect($.$group.b.get()).toBe(1)
})

test('group.get()', () => {
  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(2)
      const c = select(() => a.get() + b.get())
      const $inner = group(() => {
        const d = atom(4)
        return { d }
      })
      return { a, b, c, $inner }
    })

    return { $group }
  })

  expect($.get()).toEqual({ $group: { a: 1, b: 2, $inner: { d: 4 } } })
  expect($.$group.get()).toEqual({ a: 1, b: 2, $inner: { d: 4 } })
  expect($.$group.$inner.get()).toEqual({ d: 4 })
})

test('group.use()', () => {
  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(2)
      const c = select(() => a.get() + b.get())
      const $inner = group(() => {
        const d = atom(4)
        return { d }
      })
      return { a, b, c, $inner }
    })

    return { $group }
  })

  const calls1 = makeHookCallSpy(() => $.use())
  const calls2 = makeHookCallSpy(() => $.$group.use())
  const calls3 = makeHookCallSpy(() => $.$group.$inner.use())

  expect(calls1()).toEqual([[{ $group: { a: 1, b: 2, $inner: { d: 4 } } }]])
  expect(calls2()).toEqual([[{ a: 1, b: 2, $inner: { d: 4 } }]])
  expect(calls3()).toEqual([[{ d: 4 }]])

  act(() => {
    $.$group.b.set(5)
    pubsub.flush()
  })

  expect(calls1()).toEqual([
    [{ $group: { a: 1, b: 2, $inner: { d: 4 } } }],
    [{ $group: { a: 1, b: 5, $inner: { d: 4 } } }],
  ])
  expect(calls2()).toEqual([
    [{ a: 1, b: 2, $inner: { d: 4 } }],
    [{ a: 1, b: 5, $inner: { d: 4 } }],
  ])
  expect(calls3()).toEqual([[{ d: 4 }]])
})
