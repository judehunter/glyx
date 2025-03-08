import { assertWith } from '../../test/utils'
import { Atom, AtomInternals } from '../methods/atom'
import { Group, GroupInternals } from '../methods/group'

const modifyMethods = <T extends Atom<any>>(value: T, opts: PersistOptions) => {
  const { set } = value
  value.set = (value: T) => {
    set(value)
    localStorage.setItem(
      opts.key,
      JSON.stringify({ value, version: opts.version ?? 0 }),
    )
  }
  return value as T
}

export type PersistOptions = { key: string; version?: number }

export const persist =
  <T extends Group<Record<string, any>>>({ key, version }: PersistOptions) =>
  (value: T) => {
    assertWith<GroupInternals | AtomInternals>(value)

    if (value._glyx.type === 'atom') {
      return modifyMethods(value as any as Atom<any>, { key, version })
    }

    if (value._glyx.type === 'group') {
      for (const key in value) {
        const groupValue = value[key]
        if (groupValue._glyx.type === 'atom') {
          modifyMethods(value[key], { key, version })
        }
      }
    }
  }
