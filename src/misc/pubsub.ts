export const pubsub = () => {
  let stored = {} as Record<string, any>
  const listeners = {} as Record<string, ((value: any) => void)[]>

  let pendingUpdates: Record<string, any> | undefined
  let applyPromise: Promise<void> | undefined

  const applyUpdates = () => {
    if (!applyPromise) {
      return
    }
    if (!pendingUpdates) {
      throw new Error('no pending updates')
    }

    stored = { ...stored, ...pendingUpdates }

    const keys = Object.keys(pendingUpdates)

    pendingUpdates = undefined
    applyPromise
    applyPromise = undefined

    const dedupedListeners = [
      ...new Set(
        keys
          .map((key) => listeners[key])
          .flat()
          .filter(Boolean),
      ),
    ]

    for (const listener of dedupedListeners) {
      // TODO
      ;(listener as any)()
    }
  }

  const flush = () => {
    // applyUpdates might add more updates
    while (pendingUpdates) {
      applyUpdates()
    }
  }

  const set = (key: string, value: any) => {
    // replace the stored object so that the reference changes.
    // this is primarily used for useSyncExternalStoreWithSelector behavior.
    // todo: consider if this can be optimized more (though it should be fine)
    stored = { ...stored, [key]: value }

    if (pendingUpdates === undefined) {
      if (applyPromise) {
        throw new Error('applyPromise already exists')
      }

      pendingUpdates = {}
      applyPromise = Promise.resolve().then(applyUpdates)
    }

    pendingUpdates[key] = value
  }

  const get = (key: string) => stored[key]

  const getAll = () => stored

  const has = (key: string) => key in stored

  const sub = (keys: string[], listener: (value: any) => void) => {
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

  const getListeners = () => listeners

  return { set, get, getAll, has, sub, getListeners, flush }
}
