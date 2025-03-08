import { expect, test, vi } from 'vitest'
import { store } from '../../src/index'
import { event } from '../../src/methods/event'
import { assertWith } from '../utils'
import { StoreInternals } from '../../src/methods/store'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { pubsub } from '../../src/misc/pubsub'

test('single listener, no props', () => {
  const $ = store(() => {
    const e = event()

    return { e }
  })

  const spy = vi.fn()

  $.e.on(spy)

  $.e.emit()
  pubsub.flush()

  expect(spy.mock.calls).toEqual([[undefined]])
})

test('multiple listeners, no props', () => {
  const $ = store(() => {
    const e = event()

    return { e }
  })

  const spy1 = vi.fn()
  const spy2 = vi.fn()

  $.e.on(spy1)
  $.e.on(spy2)

  $.e.emit()
  pubsub.flush()

  expect(spy1.mock.calls).toEqual([[undefined]])
  expect(spy2.mock.calls).toEqual([[undefined]])
})

test('single listener, with props', () => {
  const $ = store(() => {
    const e = event<number>()

    return { e }
  })

  const spy = vi.fn()

  $.e.on(spy)

  $.e.emit(123)
  pubsub.flush()

  expect(spy.mock.calls).toEqual([[123]])
})

test('.useOn', () => {
  const $ = store(() => {
    const e = event<number>()

    return { e }
  })

  const spy = vi.fn()

  renderHook(() => {
    $.e.useOn(spy)
    return null
  })

  expect(spy.mock.calls).toEqual([])

  act(() => {
    $.e.emit(123)
    pubsub.flush()
  })

  expect(spy.mock.calls).toEqual([[123]])
})

test('.useOn registers and unregisters', () => {
  const $ = store(() => {
    const e = event()

    return { e }
  })

  const { unmount } = renderHook(() => {
    $.e.useOn(() => {})
    return null
  })

  expect(pubsub.getListeners()['$.e']).toHaveLength(1)

  unmount()

  expect(pubsub.getListeners()['$.e']).toHaveLength(0)
})
