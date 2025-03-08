import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { assertWith, makeHookCallSpy } from './utils'
import React, { useState } from 'react'
import { StoreInternals } from '../src/methods/store'
import { Group } from '../src/methods/group'

test('group with nested atom', () => {
  const $ = store(() => {
    const canvas = group(() => {
      const nodeCount = atom(10)

      return { nodeCount }
    })

    return { canvas }
  })

  assertWith<StoreInternals>($)

  expect($.getInternals().getStored().getAll()).toEqual({
    'canvas.nodeCount': 10,
  })

  $.canvas.nodeCount.set(20)
  $.getInternals().getStored().flush()

  expect($.getInternals().getStored().getAll()).toEqual({
    'canvas.nodeCount': 20,
  })
})

test('nested groups with atoms', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = group(() => {
      const c = atom(2)

      const d = group(() => {
        const e = atom(3)

        return { e }
      })

      return { c, d }
    })

    return { a, b }
  })

  assertWith<StoreInternals>($)

  expect($.getInternals().getStored().getAll()).toEqual({
    a: 1,
    'b.c': 2,
    'b.d.e': 3,
  })

  $.a.set(4)
  $.b.c.set(5)
  $.b.d.e.set(6)
  $.getInternals().getStored().flush()

  expect($.getInternals().getStored().getAll()).toEqual({
    a: 4,
    'b.c': 5,
    'b.d.e': 6,
  })
})

test('group.pick() is fine-grained', () => {
  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(2)

      return { a, b }
    })

    return { $group }
  })

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.$group.pick(['a']).use())

  expect(calls()).toEqual([[{ a: 1 }]])

  act(() => {
    $.$group.a.set(3)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])

  act(() => {
    $.$group.b.set(4)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])
})

test('store.pick()', () => {
  const $ = store(() => {
    const a = atom(1)
    const b = atom(2)

    return { a, b }
  })

  assertWith<StoreInternals>($)

  const calls = makeHookCallSpy(() => $.pick(['a']).use())

  expect(calls()).toEqual([[{ a: 1 }]])

  act(() => {
    $.a.set(3)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])

  act(() => {
    $.b.set(4)
    $.getInternals().getStored().flush()
  })

  expect(calls()).toEqual([[{ a: 1 }], [{ a: 3 }]])
})

test('group.with() middleware on all atoms', () => {
  const plusOneAllAtoms = <T extends Group<Record<string, any>>>(group: T) => {
    for (const key of Object.keys(group)) {
      const value = group[key]
      if (value.getInternals?.().type === 'atom') {
        const set = value.set
        value.set = (value) => {
          set(value + 1)
        }
      }
    }
    return group as T
  }

  const $ = store(() => {
    const $group = group(() => {
      const a = atom(1)
      const b = atom(1)
      return { a, b }
    }).with(plusOneAllAtoms)

    return { $group }
  })

  assertWith<StoreInternals>($)

  expect($.$group.a.get()).toBe(1)
  expect($.$group.b.get()).toBe(1)

  $.$group.a.set(2)
  $.getInternals().getStored().flush()

  expect($.$group.a.get()).toBe(3)
  expect($.$group.b.get()).toBe(1)
})
