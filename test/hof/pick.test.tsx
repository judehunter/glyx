import { expect, expectTypeOf, test } from 'vitest'
import { store } from '../../../src/methods/store'
import { assertWith } from '../../utils'
import { pick } from '../../../src/middleware/pick'
import { StoreInternals } from '../../../src/methods/store'
import { atom } from '../../../src/methods/atom'
import { pubsub } from '../../../src/misc/pubsub'

// TODO: this could be a good way to specify whether
// an optic uses get/set
test('pick method from atom', () => {
  const $ = store(() => {
    const a = atom(1).with(pick(['set']))

    return { a }
  })

  $.a.set(2)
  pubsub.flush()

  expect(pubsub.getAll()).toEqual({
    '$.a': 2,
  })
  expect(($.a as any).get).toBeUndefined()

  expectTypeOf($.a).toHaveProperty('set')
  expectTypeOf($.a).not.toHaveProperty('get')
})
