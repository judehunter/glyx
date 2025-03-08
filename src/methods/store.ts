import { pubsub } from '../misc/pubsub'
import { setupGroup } from '../misc/setup'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'

type Store = any // todo

export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const def = defFn()
  const stored = pubsub()

  setupGroup(stored, def, undefined)

  return { _glyxTest: () => ({ stored }), ...def }
}
