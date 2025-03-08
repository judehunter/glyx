import { expect, test, vi } from 'vitest'
import { store, atom, watch } from '../../src/index'
import { StoreInternals } from '../../src/methods/store'
import { assertWith } from '../utils'
import { pubsub } from '../../src/misc/pubsub'

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

  expect(spy).toHaveBeenCalledTimes(0)

  $.a.set(3)
  $.a.set(4)
  pubsub.flush()

  expect(spy).toHaveBeenCalledTimes(1)
})
