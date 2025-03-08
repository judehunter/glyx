import { expect, test, vi } from 'vitest'
import { store } from '../../src/index'
import { event } from '../../src/methods/event'
import { assertWith } from '../utils'
import { StoreInternals } from '../../src/methods/store'

test('single listener, no props', () => {
  const $ = store(() => {
    const e = event()

    return { e }
  })

  assertWith<StoreInternals>($)

  const spy = vi.fn()

  $.e.on(spy)

  $.e.emit()
  $.getInternals().getStored().flush()

  expect(spy.mock.calls).toEqual([[undefined]])
})

test('multiple listeners, no props', () => {
  const $ = store(() => {
    const e = event()

    return { e }
  })

  assertWith<StoreInternals>($)

  const spy1 = vi.fn()
  const spy2 = vi.fn()

  $.e.on(spy1)
  $.e.on(spy2)

  $.e.emit()
  $.getInternals().getStored().flush()

  expect(spy1.mock.calls).toEqual([[undefined]])
  expect(spy2.mock.calls).toEqual([[undefined]])
})

test('single listener, with props', () => {
  const $ = store(() => {
    const e = event<number>()

    return { e }
  })

  assertWith<StoreInternals>($)

  const spy = vi.fn()

  $.e.on(spy)

  $.e.emit(123)
  $.getInternals().getStored().flush()

  expect(spy.mock.calls).toEqual([[123]])
})
