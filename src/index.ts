import { useSyncExternalStore } from 'react'

export const group = (defFn: () => Record<string, any>) => {
  const def = defFn()

  return { _glyxType: 'group', ...def }
}

export const atom = (initialValue: any) => {
  const target = {
    _glyxType: 'atom',
    _glyxInitialValue: initialValue,
    get: () => {
      return target._glyxGet()
    },
    use: () => {
      return useSyncExternalStore(target._glyxSub, target.get)
    },
    sub: (...args) => {
      return target._glyxSub(...args)
    },
    set: (value: any) => {
      target._glyxSet(value)
    },
  }

  return target
}

const select = (selectFn: (...args: any[]) => any) => {
  return { _glyxType: 'select', selectFn }
}

const pubsub = () => {
  const stored = {} as Record<string, any>
  const listeners = {} as Record<string, ((value: any) => void)[]>

  const set = (key: string, value: any) => {
    stored[key] = value

    if (listeners[key]) {
      for (const listener of listeners[key]) {
        listener(value)
      }
    }
  }

  const get = (key: string) => stored[key]

  const getAll = () => stored

  const register = (keys: string[], listener: (value: any) => void) => {
    for (const key of keys) {
      if (listeners[key]) {
        listeners[key].push(listener)
      } else {
        listeners[key] = [listener]
      }
    }

    return () => {
      for (const key of keys) {
        if (listeners[key]) {
          listeners[key] = listeners[key].filter((l) => l !== listener)
        }
      }
    }
  }

  return { set, get, getAll, register }
}

const makeKey = (groupKey: string | undefined, key: string) => {
  return groupKey ? `${groupKey}.${key}` : key
}

export const store = (defFn: () => Record<string, any>) => {
  const def = defFn()
  const stored = pubsub()

  const setupAtom = (target: any, key: string) => {
    stored.set(key, target._glyxInitialValue)

    target._glyxGet = () => stored.get(key)
    target._glyxSub = (listener) => stored.register([key], listener)
    target._glyxSet = (value: any) => stored.set(key, value)
  }

  const setupGroup = (targetDef: any, groupKey: string | undefined) => {
    for (const key in targetDef) {
      const value = targetDef[key]

      if (value._glyxType === 'atom') {
        setupAtom(value, makeKey(groupKey, key))
      } else if (value._glyxType === 'group') {
        setupGroup(value, makeKey(groupKey, key))
      }
    }
  }

  setupGroup(def, undefined)

  return { _glyxTest: () => ({ stored }), ...def }
}
