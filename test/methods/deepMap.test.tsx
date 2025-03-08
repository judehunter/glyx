import { expect, test } from 'vitest'
import { store } from '../../src'
import { deepMap } from '../../src/methods/deepMap'
import { makeHookCallSpy } from '../utils'
import { act } from 'react'
import { pubsub } from '../../src/misc/pubsub'

test('deepMap.pick() - single key, unchanged structure', () => {
  const obj = Object.freeze({
    A: 1,
    B: {
      BA: 2,
      BB: {
        BBA: 3,
        BBB: 4,
      },
    },
  })
  const $ = store(() => {
    const foo = deepMap(obj)
    return { foo }
  })

  expect($.foo.get()).toEqual(obj)
  expect(pubsub.getAll()).toEqual({ foo: obj })

  const calls1 = makeHookCallSpy(() => $.foo.pick(['B.BB.BBA']).use())
  const calls2 = makeHookCallSpy(() => $.foo.pick(['B.BA']).use())

  expect(calls1()).toEqual([
    [
      {
        B: {
          BB: {
            BBA: 3,
          },
        },
      },
    ],
  ])
  expect(calls2()).toEqual([
    [
      {
        B: {
          BA: 2,
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BB: { BBA: 5 } } })
    pubsub.flush()
  })

  expect(calls1()).toEqual([
    [
      {
        B: {
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])
  expect(calls2()).toEqual([
    [
      {
        B: {
          BA: 2,
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BB: { BBB: 6 } } })
    pubsub.flush()
  })

  expect(calls1()).toEqual([
    [
      {
        B: {
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])
  expect(calls2()).toEqual([
    [
      {
        B: {
          BA: 2,
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BA: 7 } })
    pubsub.flush()
  })

  expect(calls1()).toEqual([
    [
      {
        B: {
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])
  expect(calls2()).toEqual([
    [
      {
        B: {
          BA: 2,
        },
      },
    ],
    [
      {
        B: {
          BA: 7,
        },
      },
    ],
  ])
})

test('deepMap.pick() - multi key, unchanged structure', () => {
  const obj = Object.freeze({
    A: 1,
    B: {
      BA: 2,
      BB: {
        BBA: 3,
        BBB: 4,
      },
    },
  })

  const $ = store(() => {
    const foo = deepMap(obj)
    return { foo }
  })

  const calls = makeHookCallSpy(() => $.foo.pick(['B.BB.BBA', 'B.BA']).use())

  expect(calls()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BB: { BBA: 5 } } })
    pubsub.flush()
  })

  expect(calls()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BB: { BBB: 6 } } })
    pubsub.flush()
  })

  expect(calls()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])

  act(() => {
    $.foo.setDeep({ B: { BA: 7 } })
    pubsub.flush()
  })

  expect(calls()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 5,
          },
        },
      },
    ],
    [
      {
        B: {
          BA: 7,
          BB: {
            BBA: 5,
          },
        },
      },
    ],
  ])
})

test.only('deepMap.pick() - multi key, changed structure', () => {
  const obj = Object.freeze({
    A: 1,
    B: {
      BA: 2,
      BB: {
        BBA: 3,
        BBB: 4,
      },
    } as
      | {
          BA: number
          BB: {
            BBA: number
            BBB: number
          }
        }
      | { alt: { nested: number } },
  })

  const $ = store(() => {
    const foo = deepMap(obj)
    return { foo }
  })

  const calls1 = makeHookCallSpy(() => $.foo.pick(['B.BB.BBA', 'B.BA']).use())
  const calls2 = makeHookCallSpy(() => $.foo.pick(['B']).use())
  const calls3 = makeHookCallSpy(() =>
    $.foo.pick(['B.alt.nested'], { strict: false }).use(),
  )

  expect(calls1()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
  ])
  expect(calls2()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
            BBB: 4,
          },
        },
      },
    ],
  ])
  expect(calls3()).toEqual([[{ B: { alt: { nested: undefined } } }]])

  $.foo.setDeep({})
  act(() => {
    $.foo.setDeep({ B: { alt: { nested: 5 } } })
    pubsub.flush()
  })

  expect(calls1()).toEqual([
    [
      {
        B: {
          BA: 2,
          BB: {
            BBA: 3,
          },
        },
      },
    ],
  ])
})

test('descendant changes')

test('ancestor changes')

test('scrict false')

test('missing path throws')

test('arrays are not deeply observed')
