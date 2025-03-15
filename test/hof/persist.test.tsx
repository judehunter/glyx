import { expect, test, vi } from 'vitest'
import { atom, persist, pubsub, store } from '../../src'
import { getAtomName } from '../../src/hof/persist'

const makeMockStorage = (init = {}) => {
  const storage = { ...init }
  const getItem = vi.fn((key: string) => storage[key])
  const setItem = vi.fn((key: string, value: string) => {
    storage[key] = value
  })
  return { getItem, setItem, getAll: () => storage }
}

test('persist on atom, loaded instantly, empty storage', () => {
  const storage = makeMockStorage()

  const { $ } = store(() => {
    const a = persist({ key: 'test', storage, loadOnInit: true })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['test']])
  expect(storage.setItem.mock.calls).toEqual([
    ['test', '{"value":1,"version":0}'],
  ])
  expect(storage.getAll()).toEqual({ test: '{"value":1,"version":0}' })
  expect($.a.get()).toEqual(1)
})

test('persist on atom, loaded instantly, from storage', () => {
  const storage = makeMockStorage({ test: '{"value":2,"version":0}' })

  const { $ } = store(() => {
    const a = persist({ key: 'test', storage, loadOnInit: true })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['test']])
  expect(storage.setItem.mock.calls).toEqual([
    ['test', '{"value":2,"version":0}'],
  ])
  expect(storage.getAll()).toEqual({ test: '{"value":2,"version":0}' })
  expect($.a.get()).toEqual(2)
})

test('persist on atom, loaded manually, empty storage', () => {
  const storage = makeMockStorage()

  const { $ } = store(() => {
    const a = persist({ key: 'test', storage })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([])
  expect(storage.setItem.mock.calls).toEqual([])
  expect(storage.getAll()).toEqual({})

  $.a.persist.load()
  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['test']])
  expect(storage.setItem.mock.calls).toEqual([
    ['test', '{"value":1,"version":0}'],
  ])
  expect(storage.getAll()).toEqual({ test: '{"value":1,"version":0}' })
  expect($.a.get()).toEqual(1)
})

test('persist on atom, loaded manually, from storage', () => {
  const storage = makeMockStorage({ test: '{"value":2,"version":0}' })

  const { $ } = store(() => {
    const a = persist({ key: 'test', storage })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([])
  expect(storage.setItem.mock.calls).toEqual([])
  expect(storage.getAll()).toEqual({ test: '{"value":2,"version":0}' })

  $.a.persist.load()
  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['test']])
  expect(storage.setItem.mock.calls).toEqual([
    ['test', '{"value":2,"version":0}'],
  ])
  expect(storage.getAll()).toEqual({ test: '{"value":2,"version":0}' })
  expect($.a.get()).toEqual(2)
})

test('persist on atom, different version', () => {
  const storage = makeMockStorage({ test: '{"value":2,"version":0}' })

  const { $ } = store(() => {
    const a = persist({ key: 'test', storage, version: 1 })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([])
  expect(storage.setItem.mock.calls).toEqual([])
  expect(storage.getAll()).toEqual({ test: '{"value":2,"version":0}' })

  $.a.persist.load()
  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['test']])
  expect(storage.setItem.mock.calls).toEqual([
    ['test', '{"value":1,"version":1}'],
  ])
  expect(storage.getAll()).toEqual({ test: '{"value":1,"version":1}' })
  expect($.a.get()).toEqual(1)
})

test('persist on atom, atom name as key', () => {
  const storage = makeMockStorage()

  const { $ } = store(() => {
    const a = persist({ key: getAtomName, storage })(atom(1))
    return { a }
  })

  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([])
  expect(storage.setItem.mock.calls).toEqual([])
  expect(storage.getAll()).toEqual({})

  $.a.persist.load()
  pubsub.flush()

  expect(storage.getItem.mock.calls).toEqual([['$.a']])
  expect(storage.setItem.mock.calls).toEqual([
    ['$.a', '{"value":1,"version":0}'],
  ])
  expect(storage.getAll()).toEqual({ '$.a': '{"value":1,"version":0}' })
  expect($.a.get()).toEqual(1)
})
