import { Atom, AtomInternals } from '../methods/atom'
import { Group, GroupInternals } from '../methods/group'
import { onInit } from '../methods/onInit'
import { assertWith } from '../misc/utils'

const modifyAtom = <T extends Record<string, any>>(
  target: T,
  opts: PersistOptions,
) => {
  const { set } = target

  const storage = opts.storage ?? localStorage
  const version = opts.version ?? 0

  const getKey = () => {
    if (typeof opts.key === 'function') {
      return opts.key(target as any)
    }
    return opts.key
  }

  const save = (atomValue: any) => {
    storage.setItem(getKey(), JSON.stringify({ value: atomValue, version }))
  }

  const load = () => {
    try {
      const storageValue = storage.getItem(getKey())
      if (!storageValue) {
        save(target.get())
        return
      }
      const parsed = JSON.parse(storageValue)
      if (parsed.version !== version) {
        save(target.get())
        return
      }
      set(parsed.value)
      save(parsed.value)
    } catch (e) {
      console.error(e)
    }
  }

  onInit(() => {
    if (opts.loadOnInit) {
      load()
    }
  })
  ;(target as any).set = (value: T) => {
    set(value)
    save(value)
  }

  return { ...target, persist: { load, save } }
}

export type PersistOptions = {
  key: string | ((atom: Atom<any>) => string)
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  version?: number
  loadOnInit?: boolean
}

export const getAtomName = (atom: Atom<any>) => {
  assertWith<AtomInternals>(atom)
  return atom.getInternals().name
}

export const persist =
  <T extends Atom<any> | Group<Record<string, any>>>(opts: PersistOptions) =>
  (value: T) => {
    const valueWithInternals = value
    assertWith<GroupInternals | AtomInternals>(valueWithInternals)

    const internals = valueWithInternals.getInternals?.()

    if (!internals) {
      throw new Error('Passed a non-glyx value to persist')
    }

    if (internals.type === 'atom') {
      return modifyAtom(value, opts)
    }

    throw new Error('Persist middleware is only supported on atoms')

    // TODO:
    // if (internals.type === 'group') {

    //   for (const key in value) {
    //     const groupValue = value[key]

    //     if (groupValue._glyx.type === 'atom') {
    //       modifyAtom(value[key], opts)
    //     }
    //   }
    // }
  }
