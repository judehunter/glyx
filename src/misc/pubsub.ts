const makePubsub = () => {
  let stored = {} as Record<string, any>
  let listeners = {} as Record<string, ((value: any) => void)[]>

  let pendingUpdates: Record<string, any> | undefined
  let applyPromise: Promise<void> | undefined

  const applyUpdates = () => {
    if (!applyPromise) {
      return
    }
    if (!pendingUpdates) {
      throw new Error('no pending updates')
    }

    // replace the stored object so that the reference changes.
    // this is primarily used for useSyncExternalStoreWithSelector behavior.
    // todo: consider if this can be optimized more (though it should be fine)
    stored = { ...stored, ...pendingUpdates }

    const keys = Object.keys(pendingUpdates)

    pendingUpdates = undefined
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
    // todo: error on infinite loop
    while (pendingUpdates) {
      applyUpdates()
    }
  }

  const setKey = (key: string, value: any) => {
    if (pendingUpdates === undefined) {
      if (applyPromise) {
        throw new Error('applyPromise already exists')
      }

      pendingUpdates = {}
      applyPromise = new Promise((resolve) => setTimeout(resolve, 0))
      applyPromise.then(flush)
    }

    pendingUpdates[key] = value
  }

  const setKeyInitialValue = (key: string, value: any) => {
    stored[key] = value
  }

  const getKey = (key: string) => {
    if (!(key in stored)) {
      throw new Error(`Key ${key} not found`)
    }
    return stored[key]
  }

  const getAll = () => stored

  const hasKey = (key: string) => key in stored

  const subKeys = (keys: string[], listener: (value: any) => void) => {
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

  const delKey = (key: string) => {
    delete stored[key]
    delete listeners[key]
    delete pendingUpdates?.[key]
  }

  const reset = () => {
    stored = {}
    listeners = {}
    pendingUpdates = undefined
    applyPromise = undefined
  }

  const assertNameNotExists = (name: string) => {
    if (name in stored) {
      throw new Error(`Name ${name} already exists`)
    }
  }

  let anonCounter = 0
  const getAnonName = () => `anon-${anonCounter++}`

  const getListeners = () => listeners

  return {
    setKey,
    getKey,
    getAll,
    hasKey,
    subKeys,
    setKeyInitialValue,
    getListeners,
    flush,
    getAnonName,
    reset,
    assertNameNotExists,
    delKey,
  }
}

export const pubsub = makePubsub()
