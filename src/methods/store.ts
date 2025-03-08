import { pubsub } from '../misc/pubsub'
import { makeKey } from '../misc/utils'

export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const def = defFn()
  const stored = pubsub()

  const setupAtom = (target: any, key: string) => {
    stored.set(key, target._glyx.initialValue)

    target._glyx = {
      ...target._glyx,
      get: () => stored.get(key),
      getAll: () => stored.getAll(),
      sub: (listener) => stored.sub([key], listener),
      subWithDeps: stored.sub,
      set: (value: any) => stored.set(key, value),
      name: key,
    }
  }

  const setupSelect = (target: any, key: string) => {
    target._glyx = {
      ...target._glyx,
      get: () => stored.get(key),
      getAll: () => stored.getAll(),
      subWithDeps: stored.sub,
      name: key,
    }
  }

  const setupGroup = (targetDef: any, groupKey: string | undefined) => {
    for (const key of Object.keys(targetDef).filter((x) => x !== '_glyx')) {
      const value = targetDef[key]

      if (!value._glyx) {
        continue
      }
      if (value._glyx.type === 'atom') {
        setupAtom(value, makeKey(groupKey, key))
      } else if (value._glyx.type === 'group') {
        setupGroup(value, makeKey(groupKey, key))
      } else if (value._glyx.type === 'select') {
        setupSelect(value, makeKey(groupKey, key))
      }
    }
  }

  setupGroup(def, undefined)

  return { _glyxTest: () => ({ stored }), ...def }
}
