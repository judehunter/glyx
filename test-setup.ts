import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { pubsub } from './src/misc/pubsub'

expect.extend(matchers)

beforeEach(() => {
  pubsub.reset()
})

afterEach(() => {
  cleanup()
})
