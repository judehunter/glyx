export const pubsub = () => {
  let stored = {} as Record<string, any>
  const listeners = {} as Record<string, ((value: any) => void)[]>

  const set = (key: string, value: any) => {
    // replace the stored object so that the reference changes.
    // this is primarily used for useSyncExternalStoreWithSelector behavior.
    stored = { ...stored, [key]: value }

    if (listeners[key]) {
      for (const listener of listeners[key]) {
        listener(value)
      }
    }
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

  return { set, get, getAll, has, sub }
}
