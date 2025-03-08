import { useMemo, useRef, useSyncExternalStore } from 'react'
import { attachObjToFn, uniqueDeps } from './utils'
import { pubsub } from './pubsub'
import {
  callAndTrackDeps,
  DEPS_LIST,
  pushToDepsListIfTracking,
  TRACKING_DEPS,
} from './deps'

// let GET_DEPS_CB = { current: null as null | (() => void) }

export const group = (defFn: () => Record<string, any>) => {
  const def = defFn()

  return { _glyx: { type: 'group' }, ...def }
}

export const atom = (initialValue: any) => {
  const target = {
    _glyx: { type: 'atom', initialValue },
    get: (customSelector?: (...args: any[]) => any) => {
      pushToDepsListIfTracking(target._glyx.name)

      const customSelectorOrNoop = customSelector ?? ((x) => x)

      const value = customSelectorOrNoop(target._glyx.get())
      return value
    },
    use: (customSelector?: (...args: any[]) => any) => {
      const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

      const subscribe = useMemo(
        () => (listener) => {
          console.log('subscribe')
          if (!customSelectorDepsRef.current) {
            throw new Error('customSelectorDepsRef.current is undefined')
          }
          return target._glyx.subWithDeps(
            uniqueDeps([target._glyx.name], customSelectorDepsRef.current),
            (...args) => {
              console.log('s', ...args)
              listener(...args)
            },
          )
        },
        [],
      )

      return useSyncExternalStore(subscribe, () => {
        console.log('getSnapshot ->')
        const value = target.get()

        let valueFromCustomSelector: typeof value

        if (!customSelectorDepsRef.current) {
          if (!customSelector) {
            customSelectorDepsRef.current = []
          } else {
            console.log('custom selector deps ->')
            const { value: valueFromTracking, depsList } = callAndTrackDeps(
              {
                trackDeps: true,
                // if the deps can't be tracked, then everything falls apart,
                // since the subscriber won't fire
                errorOnAlreadyTrackingDeps: true,
              },
              () => customSelector(value),
            )
            console.log('custom selector deps <-', depsList, valueFromTracking)
            customSelectorDepsRef.current = depsList
            valueFromCustomSelector = valueFromTracking
          }
        }

        if (valueFromCustomSelector === undefined) {
          if (customSelector) {
            console.log('custom selector ->')
            valueFromCustomSelector = customSelector(value)
            console.log('custom selector <-')
          } else {
            valueFromCustomSelector = value
          }
        }

        console.log('getSnapshot <-\n')

        return valueFromCustomSelector
      })
    },
    // sub: () => {
    //   return target._glyx.sub()
    // },
    set: (value: any) => {
      target._glyx.set(value)
    },
  }

  return target
}

export const select = (selector: (...args: any[]) => any) => {
  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: (customSelector?: (...args: any[]) => any) => {
          const { value, depsList } = callAndTrackDeps(
            { trackDeps: !target._glyx.depsList },
            () => selector(...args),
          )
          target._glyx.depsList ??= depsList

          const customSelectorOrNoop = customSelector
            ? (x) => select(customSelector)(x).get()
            : (x) => x

          // todo: add error handling and cleanup of deps on error
          const valueFromCustomSelect = customSelectorOrNoop(value)

          return valueFromCustomSelect
        },
        use: (customSelector?: (...args: any[]) => any) => {
          const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

          const subscribe = useMemo(
            () => (listener) => {
              if (!customSelectorDepsRef.current) {
                throw new Error('customSelectorDepsRef.current is undefined')
              }

              return target._glyx.subWithDeps(
                uniqueDeps(
                  target._glyx.depsList,
                  customSelectorDepsRef.current,
                ),
                listener,
              )
            },
            [],
          )
          return useSyncExternalStore(subscribe, () => {
            const value = target(...args).get()

            let valueFromCustomSelector: typeof value

            if (!customSelectorDepsRef.current) {
              if (!customSelector) {
                customSelectorDepsRef.current = []
              } else {
                const { value: valueFromTracking, depsList } = callAndTrackDeps(
                  {
                    trackDeps: true,
                    // if the deps can't be tracked, then everything falls apart,
                    // since the subscriber won't fire
                    errorOnAlreadyTrackingDeps: true,
                  },
                  () => customSelector(value),
                )
                customSelectorDepsRef.current = depsList
                valueFromCustomSelector = valueFromTracking
              }
            }

            if (!valueFromCustomSelector) {
              if (customSelector) {
                valueFromCustomSelector = customSelector(value)
              } else {
                valueFromCustomSelector = value
              }
            }

            return valueFromCustomSelector
          })
        },
        // TODO: custom select fn
        sub: () => {
          if (!target._glyx.depsList) {
            target(...args).get()
          }
          return target._glyx.subWithDeps(...args)
        },
      }
    },
    {
      _glyx: {
        type: 'select',
        depsList: undefined as undefined | string[],
      },
    },
  )

  return target
}

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
      get: () => stored.get(key),
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
