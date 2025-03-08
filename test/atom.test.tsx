import { assertType, describe, expect, expectTypeOf, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { assertWith, makeHookCallSpy } from './utils'
import React from 'react'
import { StoreInternals } from '../src/methods/store'
import { Atom } from '../src/methods/atom'

test('atom.get() of initial value', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  expect($.counter.get()).toBe(5)
})

test('atom.set()', () => {
  const $ = store(() => {
    const counter = atom(5)

    return { counter }
  })

  assertWith<StoreInternals>($)

  expect($.getInternals().getStored().getKey('counter')).toBe(5)

  $.counter.set(10)
  $.getInternals().getStored().flush()

  expect($.getInternals().getStored().getKey('counter')).toBe(10)
})

test.skip('atom.sub()', () => {
  const $ = store(() => {
    const counter = atom(0)

    return { counter }
  })

  assertWith<StoreInternals>($)

  const listener = vi.fn()

  $.counter.sub(listener)

  $.counter.set(1)
  $.getInternals().getStored().flush()

  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledWith(1)

  $.counter.set(5)
  $.getInternals().getStored().flush()

  expect(listener).toHaveBeenCalledTimes(2)
  expect(listener).toHaveBeenCalledWith(5)
})

test('atom.use()', () => {
  const $ = store(() => {
    const counter = atom(10)

    return { counter }
  })

  assertWith<StoreInternals>($)

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
    $.getInternals().getStored().flush()
  })

  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy.mock.lastCall?.[0]).toBe(20)

  expect(result.current).toBe(20)
})

test('atom.get() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  expect($.a.get((x) => x + 5)).toBe(15)
})

test('atom.get() with custom selector that access another atom')

test('atom.use() with custom selector', () => {
  const $ = store(() => {
    const a = atom(10)

    return { a }
  })

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.a.use((x) => x + 5))

  expect(calls()).toEqual([[15]])

  act(() => {
    $.a.set(11)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[15], [16]])
})

test('atom.use() with custom selector that access another atom', () => {
  const $ = store(() => {
    const a = atom(10)
    const b = atom(100)

    return { a, b }
  })

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.a.use((x) => x + $.b.get()))

  expect(calls()).toEqual([[110]])

  act(() => {
    $.a.set(11)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[110], [111]])

  act(() => {
    $.b.set(200)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[110], [111], [211]])
})

test('atom.use() with custom selector closing over component state', () => {
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

  assertWith<StoreInternals>($)

  expect($.getA()).toBe(1)
  expect($.getInternals().getStored().getAll()).toEqual({
    'anon-0': 1,
  })

  $.setA(2)
  $.getInternals().getStored().flush()

  expect($.getA()).toBe(2)
  expect($.getInternals().getStored().getAll()).toEqual({
    'anon-0': 2,
  })
})

test.skip('anonymous atom with the name specified in middleware')

describe.skip('.with()', () => {
  test('get middleware', () => {
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
  test('set middleware', () => {
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

    assertWith<StoreInternals>($)

    expect($.a.get()).toBe('a')

    $.a.set('b')
    $.getInternals().getStored().flush()

    expect($.a.get()).toBe('ab')
  })
  test('chaining middleware', () => {
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

    assertWith<StoreInternals>($)

    expect($.a.get()).toBe('a')

    $.a.set('b')
    $.getInternals().getStored().flush()

    expect($.a.get()).toBe('abb')
  })
  // TODO: this could be a good way to specify whether
  // an optic uses get/set
  test('remove method', () => {
    const onlyGet = <T extends Atom<any>>(a: T) => {
      // not actually removing the method, since currently
      // that breaks some stuff
      return a as Omit<T, 'set'>
    }

    const $ = store(() => {
      const a = atom(1).with(onlyGet)

      return { a }
    })

    expectTypeOf($.a).not.toHaveProperty('set')
  })
})
