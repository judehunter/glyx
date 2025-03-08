import { setCurrentStoreRef, unsetCurrentStoreRef } from '../misc/currentStore'
import { pubsub } from '../misc/pubsub'
import { Handles, setupGroup } from '../misc/setup'
import { makeKey } from '../misc/utils'
import { Atom } from './atom'
import { group } from './group'

type Store = any // todo

export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const stored = pubsub()

  const initSubbed = [] as ((handles: Handles) => void)[]
  setCurrentStoreRef({
    addOnInit: (fn) => {
      initSubbed.push(fn)
    },
  })

  const def = defFn()
  const defGroup = group(() => def)

  setupGroup(stored, defGroup, undefined)

  for (const fn of initSubbed) {
    fn(stored)
  }

  unsetCurrentStoreRef()

  return { _glyxTest: () => ({ stored }), ...defGroup }
}
