import { expect, expectTypeOf, test } from 'vitest'
import { store } from '../../src/methods/store'
import { assertWith } from '../utils'
import { pick } from '../../src/middleware/pick'
import { StoreInternals } from '../../src/methods/store'
import { atom } from '../../src/methods/atom'
import { omit } from '../../src/middleware/omit'

test('omit method from atom', () => {
  const $ = store(() => {
    const a = atom(1).with(omit(['get']))

    return { a }
  })

  assertWith<StoreInternals>($)

  expect($.a.set).toBeDefined()
  expect(($.a as any).get).toBeUndefined()

  expectTypeOf($.a).toHaveProperty('set')
  expectTypeOf($.a).not.toHaveProperty('get')
})
