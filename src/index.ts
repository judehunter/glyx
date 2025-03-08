import { useMemo, useRef, useSyncExternalStore } from 'react'
import { attachObjToFn, identity, uniqueDeps } from './utils'
import { pubsub } from './pubsub'
import {
  callAndTrackDeps,
  DEPS_LIST,
  pushToDepsListIfTracking,
  TRACKING_DEPS,
} from './deps'
import { useSyncExternalStoreWithSelector } from './useSyncExternalStoreWithSelector'

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

      const value = (customSelector ?? identity)(target._glyx.get())
      return value
    },
    use: (
      customSelector?: (...args: any[]) => any,
      eqFn?: (a: any, b: any) => boolean,
    ) => {
      const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

      const subscribe = useMemo(
        () => (listener) => {
          if (!customSelectorDepsRef.current) {
            throw new Error('customSelectorDepsRef.current is undefined')
          }

          return target._glyx.subWithDeps(
            uniqueDeps([target._glyx.name], customSelectorDepsRef.current),
            listener,
          )
        },
        [],
      )

      return useSyncExternalStoreWithSelector(
        subscribe,
        target._glyx.getAll,
        target._glyx.getAll,
        () => {
          const value = target.get()

          if (!customSelector) {
            customSelectorDepsRef.current ??= []
            return value
          }

          if (!customSelectorDepsRef.current) {
            const { value: selectedValue, depsList } = callAndTrackDeps(
              {
                trackDeps: true,
                // if the deps can't be tracked, then everything falls apart,
                // since the subscriber won't fire
                errorOnAlreadyTrackingDeps: true,
              },
              () => customSelector(value),
            )
            customSelectorDepsRef.current = depsList

            return selectedValue
          } else {
            return customSelector(value)
          }
        },
      )
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

const test = {}

export const select = (selector: (...args: any[]) => any) => {
  const target = attachObjToFn(
    (...args: any[]) => {
      return {
        get: (customSelector?: (...args: any[]) => any) => {
          const { value: selectedValue, depsList } = callAndTrackDeps(
            { trackDeps: !target._glyx.depsList },
            () => selector(...args),
          )
          target._glyx.depsList ??= depsList

          // todo: add error handling and cleanup of deps on error
          const value = (customSelector ?? identity)(selectedValue)

          return value
        },
        use: (customSelector?: (...args: any[]) => any) => {
          const customSelectorDepsRef = useRef<undefined | string[]>(undefined)

          const subscribe = useMemo(
            () => (listener) => {
              if (!customSelectorDepsRef.current) {
                throw new Error('customSelectorDepsRef.current is undefined')
              }

              console.log(
                'subscribe',
                target._glyx.depsList,
                customSelectorDepsRef.current,
              )

              return target._glyx.subWithDeps(
                uniqueDeps(
                  target._glyx.depsList,
                  customSelectorDepsRef.current,
                ),
                (value) => {
                  console.log('listener', value)
                  listener(value)
                },
              )
            },
            [],
          )

          return useSyncExternalStoreWithSelector(
            subscribe,
            // the snapshot is used here only to check the reference,
            // and the reference changes when the store is updated.
            // so between store updates, if React calls getSnapshot,
            // the selector won't be re-run, and the previously selected value
            // will be reused.
            target._glyx.getAll,
            target._glyx.getAll,
            () => {
              const value = target(...args).get()

              if (!customSelector) {
                customSelectorDepsRef.current ??= []
                return value
              }

              if (!customSelectorDepsRef.current) {
                const { value: selectedValue, depsList } = callAndTrackDeps(
                  {
                    trackDeps: true,
                    // if the deps can't be tracked, then everything falls apart,
                    // since the subscriber won't fire
                    errorOnAlreadyTrackingDeps: true,
                  },
                  () => customSelector(value),
                )
                customSelectorDepsRef.current = depsList

                return selectedValue
              } else {
                return customSelector(value)
              }
            },
          )
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
