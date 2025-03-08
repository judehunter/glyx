import { expect, vi } from 'vitest'
import { test } from 'vitest'
import { store, atom, group, select, nested } from '../src/index'
import { act, render, renderHook } from '@testing-library/react'
import { makeHookCallSpy } from './utils'
import React, { useState } from 'react'

test('group with nested atom', () => {
  const $ = store(() => {
    const canvas = group(() => {
      const nodeCount = atom(10)

      return { nodeCount }
    })

    return { canvas }
  })

  expect($._glyxTest().stored.getAll()).toEqual({
    'canvas.nodeCount': 10,
  })

  $.canvas.nodeCount.set(20)

  expect($._glyxTest().stored.getAll()).toEqual({
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

  expect($._glyxTest().stored.getAll()).toEqual({
    a: 1,
    'b.c': 2,
    'b.d.e': 3,
  })

  $.a.set(4)
  $.b.c.set(5)
  $.b.d.e.set(6)

  expect($._glyxTest().stored.getAll()).toEqual({
    a: 4,
    'b.c': 5,
    'b.d.e': 6,
  })
})
