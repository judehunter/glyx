import { useMemo, useSyncExternalStore } from 'react'
import { attachObjToFn } from './utils'
import { pubsub } from './pubsub'

let trackingDeps = false
let depsList: string[] = []

// let GET_DEPS_CB = { current: null as null | (() => void) }

export const group = (defFn: () => Record<string, any>) => {
  const def = defFn()

  return { _glyx: { type: 'group' }, ...def }
}

export const atom = (initialValue: any) => {
  const target = {
    _glyx: { type: 'atom', initialValue },
    get: () => {
      if (trackingDeps) {
        depsList.push(target._glyx.name)
      }
      const value = target._glyx.get()
      return value ? value.value : target._glyx.initialValue
    },
    use: () => {
      return useSyncExternalStore(target._glyx.sub, target.get)
    },
    sub: (...args) => {
      return target._glyx.sub(...args)
    },
    set: (value: any) => {
      target._glyx.set(value)
    },
  }

  return target
}

export const select = (selectFn: (...args: any[]) => any) => {
  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: () => {
          let isTrackingDepsNow = false
          if (!target._glyx.tracksDeps && !trackingDeps) {
            trackingDeps = true
            depsList = []
            isTrackingDepsNow = true
          }

          // todo: add error handling and cleanup of deps on error
          const value = selectFn(...args)

          if (isTrackingDepsNow) {
            target._glyx.tracksDeps = true
            target._glyx.depsList = [...depsList]
            depsList = []
            trackingDeps = false
          }

          return value
        },
        use: (...args) => {
          if (!target._glyx.tracksDeps) {
            target(...args).get()
          }
          const subscribe = useMemo(
            () => (listener) =>
              target._glyx.subWithDeps(target._glyx.depsList, (val) => {
                listener(selectFn(...args))
              }),
            [],
          )
          return useSyncExternalStore(subscribe, () => target(...args).get())
        },
        sub: (...args) => {
          return target._glyx.subWithDeps(...args)
        },
      }
    },
    {
      _glyx: {
        type: 'select',
        tracksDeps: false,
      },
    },
  )

  return target
}

// const preselectedSelect = (selectObj: ReturnType<typeof select>, args) => {
//   return attachObjToFn(() => selectObj(...args), {
//     _glyx: selectObj._glyx,
//   })
// }

export const nested = (
  selectObj: ReturnType<typeof select>,
  nestedDef: (
    selectObj: ReturnType<ReturnType<typeof select>>,
  ) => Record<string, any>,
) => {
  const newSelectObj = (...args) => {
    const nested = nestedDef(selectObj(...args))
    return { ...selectObj(...args), ...nested }
  }

  return newSelectObj
}

const makeKey = (groupKey: string | undefined, key: string) => {
  return groupKey ? `${groupKey}.${key}` : key
}

export const store = <T extends Record<string, any>>(defFn: () => T) => {
  const def = defFn()
  const stored = pubsub()

  const setupAtom = (target: any, key: string) => {
    stored.set(key, target._glyx.initialValue)

    target._glyx = {
      ...target._glyx,
      get: () => (stored.has(key) ? { value: stored.get(key) } : null),
      sub: (listener) => stored.sub([key], listener),
      set: (value: any) => stored.set(key, value),
      name: key,
    }
  }

  const setupSelect = (target: any, key: string) => {
    target._glyx = {
      ...target._glyx,
      get: () => stored.get(key),
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
