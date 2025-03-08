import { assertType, describe, expect, expectTypeOf, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom } from '../../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { assertWith, makeHookCallSpy } from '../utils'
import React from 'react'
import { StoreInternals } from '../../src/methods/store'
import { Atom, AtomInternals } from '../../src/methods/atom'
import { pick } from '../../src/middleware/pick'
import { omit } from '../../src/middleware/omit'
import { name } from '../../src/middleware/name'
import { pubsub } from '../../src/misc/pubsub'

test('.get() of initial value', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect($.counter.get()).toBe(5)
})

test('.set()', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect(pubsub.getKey('$.counter')).toBe(5)

  $.counter.set(10)
  pubsub.flush()

  expect(pubsub.getKey('$.counter')).toBe(10)
})

test('.sub()', () => {
  const $ = store(() => {
    const counter = atom(0)

    return { counter }
  })

  const spy = vi.fn()

  $.counter.sub(spy)

  $.counter.set(1)
  pubsub.flush()

  expect(spy.mock.calls).toEqual([[]])

  $.counter.set(5)
  pubsub.flush()

  expect(spy.mock.calls).toEqual([[], []])
})

test('.use()', () => {
  const $ = store(() => {
    const counter = atom(10)

    return { counter }
  })

  const spy = vi.fn()

  const { result, rerender } = renderHook(() => {
    const state = $.counter.use()
    spy(state)
    return state
  })

  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy.mock.lastCall?.[0]).toBe(10)

  act(() => {
    $.counter.set(20)
    pubsub.flush()
  })

  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy.mock.lastCall?.[0]).toBe(20)

  expect(result.current).toBe(20)
})

test('.get() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  expect($.a.get((x) => x + 5)).toBe(15)
})

test('.use() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  const calls = makeHookCallSpy(() => $.a.use((x) => x + 5))

  expect(calls()).toEqual([[15]])

  act(() => {
    $.a.set(11)
    pubsub.flush()
  })

  expect(calls()).toEqual([[15], [16]])
})

test('.get() with custom selector that access another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    return { a, b }
  })

  expect($.a.get((x) => x + $.b.get())).toBe(110)
})

test('.use() with custom selector that access another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    return { a, b }
  })

  const calls = makeHookCallSpy(() => $.a.use((x) => x + $.b.get()))

  expect(calls()).toEqual([[110]])

  act(() => {
    $.a.set(11)
    pubsub.flush()
  })

  expect(calls()).toEqual([[110], [111]])

  act(() => {
    $.b.set(200)
    pubsub.flush()
  })

  expect(calls()).toEqual([[110], [111], [211]])
})

test('.use() with custom selector closing over component state', () => {
  const $ = store(() => {
    const a = atom(1)

    return { a }
  })

  const spy = vi.fn()

  const Comp = ({ factor }: { factor: number }) => {
    const val = $.a.use((x) => x * factor)

    spy(val)

    return null
  }

  const { rerender } = render(<Comp factor={2} />)

  expect(spy.mock.calls).toEqual([[2]])

  rerender(<Comp factor={3} />)

  expect(spy.mock.calls).toEqual([[2], [3]])
})

test('anonymous atom', () => {
  const $ = store(() => {
    const a = atom(1)

    const getA = a.get
    const setA = a.set

    return { getA, setA }
  })

  expect($.getA()).toBe(1)
  expect(pubsub.getAll()).toEqual({
    'anon-0': 1,
  })

  $.setA(2)
  pubsub.flush()

  expect($.getA()).toBe(2)
  expect(pubsub.getAll()).toEqual({
    'anon-0': 2,
  })
})

test('.with() get middleware', () => {
  const plusOne = <T extends Atom<any>>(a: T) => {
    const get = a.get
    return Object.assign(a, {
      get: () => {
        return get() + 1
      },
    }) as T
  }

  const $ = store(() => {
    const a = atom(1).with(plusOne)

    return { a }
  })

  expect($.a.get()).toBe(2)
})
test('.with() set middleware', () => {
  const append = <T extends Atom<string>>(a: T) => {
    const set = a.set
    return Object.assign(a, {
      set: (value: any) => {
        return set(a.get() + value)
      },
    }) as T
  }

  const $ = store(() => {
    const a = atom('a').with(append)

    return { a }
  })

  expect($.a.get()).toBe('a')

  $.a.set('b')
  pubsub.flush()

  expect($.a.get()).toBe('ab')
})
test('.with() chaining middleware', () => {
  const append = <T extends Atom<string>>(a: T) => {
    const set = a.set
    return Object.assign(a, {
      set: (value: any) => {
        return set(a.get() + value)
      },
    }) as T
  }

  const repeat = <T extends Atom<string>>(a: T) => {
    const set = a.set
    return Object.assign(a, {
      set: (value: any) => {
        return set(value + value)
      },
    }) as T
  }

  const $ = store(() => {
    const a = atom('a').with(append).with(repeat)

    return { a }
  })

  expect($.a.get()).toBe('a')

  $.a.set('b')
  pubsub.flush()

  expect($.a.get()).toBe('abb')
})
