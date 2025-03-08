import { expect, test, vi } from 'vitest'
import { store, atom, watch } from '../src'
import { StoreInternals } from '../src/methods/store'
import { assertWith } from './utils'
test('watch callback fires once for multiple deps', () => {
  const spy = vi.fn()
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)

    watch([a, b], () => {
      spy()
    })

    return { a, b }
  })

  assertWith<StoreInternals>($)

  expect(spy).toHaveBeenCalledTimes(0)

  $.a.set(3)
  $.a.set(4)
  $.getInternals().getStored().flush()

  expect(spy).toHaveBeenCalledTimes(1)
})
