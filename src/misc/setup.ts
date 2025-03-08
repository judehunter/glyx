import { Atom } from '../methods/atom'
import { pubsub } from './pubsub'
import { makeKey } from './utils'

type Handles = {
  get: ReturnType<typeof pubsub>['get']
  getAll: ReturnType<typeof pubsub>['getAll']
  sub: ReturnType<typeof pubsub>['sub']
  set: ReturnType<typeof pubsub>['set']
}

const setupAtom = (handles: Handles, target: Atom, key: string) => {
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
