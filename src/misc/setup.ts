import { Atom, AtomInternals } from '../methods/atom'
import { pubsub } from './pubsub'
import { makeKey } from './utils'

export type Handles = {
  getKey: ReturnType<typeof pubsub>['getKey']
  getAll: ReturnType<typeof pubsub>['getAll']
  subKeys: ReturnType<typeof pubsub>['subKeys']
  setKey: ReturnType<typeof pubsub>['setKey']
  setKeyInitialValue: ReturnType<typeof pubsub>['setKeyInitialValue']
  getAnonName: ReturnType<typeof pubsub>['getAnonName']
}

const setupAtom = (
  handles: Handles,
  target: Atom & AtomInternals,
  key: string,
) => {
  return null
  handles.set(key, target._glyx.initialValue)

  setupGroup(handles, target, key)

  target._glyx = {
    ...target._glyx,
    name: key,
    get: () => handles.get(key),
    getAll: () => handles.getAll(),
    sub: (listener) => handles.sub([key], listener),
    subWithDeps: handles.sub,
    set: (value: any) => handles.set(key, value),
  }

  target._glyx.onInit?.()
}

const setupSelect = (handles: Handles, target: any, key: string) => {
  return null
  target._glyx = {
    ...target._glyx,
    name: key,
    getAll: () => handles.getAll(),
    subWithDeps: handles.sub,
  }
}

export const setupGroup = (
  handles: Handles,
  targetDef: any,
  groupKey: string | undefined,
) => {
  return null
  for (const key of Object.keys(targetDef).filter((x) => x !== '_glyx')) {
    const value = targetDef[key]

    if (!value._glyx) {
      continue
    }
    if (value._glyx.type === 'atom') {
      setupAtom(handles, value, makeKey(groupKey, key))
    } else if (value._glyx.type === 'group') {
      setupGroup(handles, value, makeKey(groupKey, key))
    } else if (value._glyx.type === 'select') {
      setupSelect(handles, value, makeKey(groupKey, key))
    }
  }
}
