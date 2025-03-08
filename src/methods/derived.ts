import { callAndTrackDeps } from '../misc/deps'
import { Atom, atom } from './atom'
import { onInit } from './onInit'

export type Derived<TValue> = Omit<Atom<TValue>, 'set'>

export const derived = <TValue>(fn: (...args: any[]) => TValue) => {
  const target = atom<TValue>(undefined!)

  onInit(({ sub }) => {
    const { value, depsList } = callAndTrackDeps(
      { trackDeps: true, errorOnAlreadyTrackingDeps: true },
      fn,
    )

    target.set(value)

    if (!depsList) {
      return
    }

    return sub(depsList, () => {
      target.set(fn())
    })
  })

  return target as Derived<TValue>
}
