import * as TB from 'ts-toolbelt'
import { setCurrentStore, unsetCurrentStore } from './currentStore'
import { getCurrentStore } from './currentStore'
import {
  Atom,
  atom,
  AtomInternals,
  AtomLike,
  InferAtomValue,
} from '../methods/atom'
import { CalledSelect, Select, select } from '../methods/select'
import { noTrack } from './deps'
import { isActualObject } from './isObject'
import { name } from '../hof/name'
import { assertWith } from './utils'

export const makePath = <T extends AtomLike>(target: T) => {
  const store = getCurrentStore()

  const pathVersionAtoms: Record<string, Atom<number>> = {}

  const pathFn = (path: string) => {
    if (!(path in pathVersionAtoms)) {
      assertWith<AtomInternals>(target)
      const targetName = target.getInternals().name

      setCurrentStore(store)
      pathVersionAtoms[path] = atom(0, { name: `${targetName}/${path}` })
      unsetCurrentStore()
    }

    pathVersionAtoms[path].get()

    const pathFragments = path.split('.')

    if (!pathFragments.length) {
      throw new Error('Path must have at least one fragment')
    }

    let nestedObj: any = noTrack(() => target.get())

    if (!isActualObject(nestedObj)) {
      throw new Error('the atom value is not an object')
    }

    for (const [index, fragment] of pathFragments.entries()) {
      nestedObj = nestedObj[fragment]

      // if it's at the end of the path,
      // break out of the loop (no need to make checks)
      if (index === pathFragments.length - 1) {
        break
      }

      // if it's an object, traverse down
      if (isActualObject(nestedObj)) {
        continue
      }

      // if it's undefined/null, return it
      if (nestedObj == null) {
        break
      }

      // if it's some other primitive or array,
      // throw an error
      throw new Error(`fragment ${fragment} is not an object`)
    }

    return nestedObj
  }

  const getActiveAncestors = (path: string) => {
    return Object.keys(pathVersionAtoms).filter((activePath) => {
      return path.startsWith(activePath)
    })
  }

  const getActiveDescendants = (path: string) => {
    return Object.keys(pathVersionAtoms).filter((activePath) => {
      return activePath.startsWith(path)
    })
  }

  const setPath = (path: string, value: any) => {
    const pathFragments = path.split('.')

    if (!pathFragments.length) {
      throw new Error('Path must have at least one fragment')
    }

    const affected = new Set([
      ...getActiveAncestors(path),
      ...getActiveDescendants(path),
    ])

    const currentValue = target.get()

    // todo: clone the object first
    let nestedObj: any = currentValue

    for (const [index, fragment] of pathFragments.slice(0, -1).entries()) {
      nestedObj = nestedObj[fragment]

      if (index === pathFragments.length - 1) {
        break
      }

      if (isActualObject(nestedObj)) {
        continue
      }

      throw new Error(`fragment ${fragment} is not an object`)
    }

    nestedObj[pathFragments.at(-1)!] = value

    target.set(currentValue)

    for (const affectedPath of affected) {
      pathVersionAtoms[affectedPath].set(
        pathVersionAtoms[affectedPath].get() + 1,
      )
    }
  }

  const pathSelect = select(pathFn, { dynamicDeps: true, set: setPath }) as any

  return pathSelect
}
