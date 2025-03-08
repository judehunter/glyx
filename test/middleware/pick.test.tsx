import { expect, expectTypeOf, test } from 'vitest'
import { store } from '../../src/methods/store'
import { assertWith } from '../utils'
import { pick } from '../../src/middleware/pick'
import { StoreInternals } from '../../src/methods/store'
import { atom } from '../../src/methods/atom'

// TODO: this could be a good way to specify whether
// an optic uses get/set
test('pick method from atom', () => {
  const $ = store(() => {
    const a = atom(1).with(pick(['set']))

    return { a }
  })

  assertWith<StoreInternals>($)

  $.a.set(2)
  $.getInternals().getStored().flush()

  expect($.getInternals().getStored().getAll()).toEqual({
    a: 2,
  })
  expect(($.a as any).get).toBeUndefined()

  expectTypeOf($.a).toHaveProperty('set')
  expectTypeOf($.a).not.toHaveProperty('get')
})
