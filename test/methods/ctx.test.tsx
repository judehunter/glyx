import React from 'react'
import { expect, test } from 'vitest'
import { atom, ctx, store } from '../../src'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { pubsub } from '../../src/misc/pubsub'

test('basic', async () => {
  const { $$canvas } = ctx(() =>
    store(() => {
      const nodes = atom([{ id: '1' }, { id: '2' }])
      const edges = atom([{ id: '1', source: '1', target: '2' }])

      return { nodes, edges }
    }),
  )

  const Child = () => {
    const $canvas = $$canvas.use()

    const nodesLength = $canvas.nodes.use((x) => x.length)

    return <div data-testid="nodes-length">{nodesLength}</div>
  }

  const Parent = () => {
    return (
      <$$canvas>
        <Child />
      </$$canvas>
    )
  }

  const { findByTestId } = render(<Parent />)

  expect(await findByTestId('nodes-length')).toHaveTextContent('2')
})

test('parameterized', async () => {
  const { $$profile } = ctx(
    ({ initial, id }: { initial: string; id: string }) =>
      store(() => {
        const userName = atom(initial)

        return { userName }
      }, id),
  )

  const Child = ({ testId }: { testId: string }) => {
    const $profile = $$profile.use()

    const userName = $profile.userName.use()

    return <div data-testid={testId}>{userName}</div>
  }

  const Parent = () => {
    return (
      <>
        <$$profile initial="John" id="$profile1">
          <Child testId="user-name-1" />
        </$$profile>
        <$$profile initial="Alex" id="$profile2">
          <Child testId="user-name-2" />
        </$$profile>
      </>
    )
  }

  const { findByTestId } = render(<Parent />)

  expect(await findByTestId('user-name-1')).toHaveTextContent('John')
  expect(await findByTestId('user-name-2')).toHaveTextContent('Alex')
})

test('state update', () => {})
