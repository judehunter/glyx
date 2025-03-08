import { expect, expectTypeOf, test } from 'vitest'
import { store } from '../../src/methods/store'
import { assertWith } from '../utils'
import { pick } from '../../src/middleware/pick'
import { StoreInternals } from '../../src/methods/store'
import { atom } from '../../src/methods/atom'
import { omit } from '../../src/middleware/omit'
import { name } from '../../src/middleware/name'

test('omit method from atom', () => {
  const $ = store(() => {
    atom(1).with(name('foo'))

    return {}
  })

  assertWith<StoreInternals>($)

  expect($.getInternals().getStored().getAll()).toEqual({
    foo: 1,
  })
})
