import { expect, expectTypeOf, test } from 'vitest'
import { atom, omit, store } from '../../src'

test('omit method from atom', () => {
  const { $ } = store(() => {
    const a = omit(['get'])(atom(1))

    return { a }
  })

  expect($.a.set).toBeDefined()
  expect(($.a as any).get).toBeUndefined()

  expectTypeOf($.a).toHaveProperty('set')
  expectTypeOf($.a).not.toHaveProperty('get')
})
