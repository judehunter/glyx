import { expect, expectTypeOf, test } from 'vitest'
import { atom, name, store } from '../../src'
import { pubsub } from '../../src/misc/pubsub'

test('omit method from atom', () => {
  const $ = store(() => {
    name('foo')(atom(1))

    return {}
  })

  expect(pubsub.getAll()).toEqual({
    foo: 1,
  })
})
