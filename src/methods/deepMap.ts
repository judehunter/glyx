import { name } from '../hof/name'
import {
  getCurrentStore,
  setCurrentStore,
  unsetCurrentStore,
} from '../misc/currentStore'
import { noTrack } from '../misc/deps'
import { assertWith } from '../misc/utils'
import { Atom, atom, AtomInternals } from './atom'
import { nested } from './nested'
import { CalledSelect, Select, select } from './select'

// const reducePath = (root: Record<string, any>, path: string[]) => {
//   return path.reduce((acc, key) => acc[key], root)
// }

// export const map = (initialValue: Record<string, any>) => {
//   const store = getCurrentStore()

//   const rootAtom = atom(Object.freeze(initialValue))

//   let paths: string[] = []

//   const getDescendantPaths = (path: string[]) => {
//     return paths.filter((p) => p.startsWith(path.join('/')))
//   }

//   const getAncestorPaths = (path: string[]) => {
//     return paths.filter((p) => p.endsWith(path.join('/')))
//   }

//   const setPath = (path: string[], value: any) => {
//     // store.handles.
//   }

//   const traverse = (path: string[] = []) => {
//     assertWith<AtomInternals>(rootAtom)

//     const rootName = rootAtom.getInternals().name

//     // TODO: NEED TO SET CURRENT STORE?

//     const value = reducePath(initialValue, path)
//     if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
//       const mapped = Object.keys(value).map((k) => {
//         return traverse([...path, k])
//       })

//       const subtreeAtom = nested(atom(value), () => mapped)
//       paths.push(path.join('/'))
//       return subtreeAtom
//     } else {
//       const leafName = `${rootName}/${path.join('/')}`
//       // todo: add the root atom name to this name
//       // also, use slash or dot notation?
//       // todo: this all could be a select on the version atom
//       // that also selects the root (but without tracking the root)
//       const leafVersion = atom(0).with(name(leafName))
//       // .with((a) => {
//       //   const { get } = a
//       //   const newGet: typeof a['get'] = (inlineSelector) => {
//       //     get()
//       //     return reducePath(store.handles.getKey(rootName), path)
//       //   }
//       //   ;(a as any).get = newGet
//       //   return { ...a, get: newGet }
//       // })

//       const leafValue = select(() => {
//         leafVersion.get() // updates when the leaf version changes
//         const rootValue = store.handles.getKey(rootName)
//         return reducePath(rootValue, path)
//       })
//       paths.push(path.join('/'))
//       return leafValue()
//     }
//   }

//   const pathMap: Record<string, { atom: any; select: any }> = {}

//   const getProxy = (path: string[]) => {
//     const proxy = new Proxy(
//       {},
//       {
//         get(_, prop) {
//           if (typeof prop === 'symbol') {
//             throw new Error('Symbols are not supported')
//           }
//           if ('') {
//             const pathValue = select(() => {})
//           }
//           return getProxy([...path, prop])
//         },
//       },
//     )
//     return proxy
//   }

//   return getProxy()
// }

type CollectPaths<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${Prefix}${K}` | CollectPaths<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never
    }[keyof T]
  : never

type C = CollectPaths<{ foo: { bar: 1 } | { buzz: 2 } }>

type DistributiveKeyOf<T> = T extends any ? keyof T : never

type FieldTypeAtPath<
  T,
  Path extends string,
> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends DistributiveKeyOf<T>
    ? FieldTypeAtPath<T[Key], Rest>
    : never
  : Path extends DistributiveKeyOf<T>
  ? T[Path]
  : never

type InnerDeepPick<
  T,
  Path extends string,
> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in Key]: InnerDeepPick<T[K], Rest> }
    : never
  : Path extends keyof T
  ? { [K in Path]: T[Path] }
  : never

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type DeepPick<T, Path extends string> = UnionToIntersection<
  InnerDeepPick<T, Path>
>

type DeepMap<TValue> = {
  pick: <TPicked extends CollectPaths<TValue>[]>(
    paths: TPicked,
    opts?: { strict?: boolean },
  ) => CalledSelect<DeepPick<TValue, TPicked[number]>>
  setDeep: (modified: {
    [K in CollectPaths<TValue>]: FieldTypeAtPath<TValue, K>
  }) => void
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

const deepMerge = <TA, TB>(a: TA, b: TB) => {
  const newObj = { ...a }
  for (const key in b) {
    if (b[key] && typeof b[key] === 'object' && !Array.isArray(b[key])) {
      newObj[key as any] = deepMerge(newObj[key as any] ?? {}, b[key])
    } else {
      newObj[key as any] = b[key]
    }
  }
  return newObj
}

const getLeafPaths = <T>(value: T) => {
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const ret = Object.keys(value)
      .map((k) => getLeafPaths(value[k]).map((p) => (p ? `${k}.${p}` : k)))
      .flat()
    return ret
  } else {
    return [null]
  }
}

/**
 * Creates atoms with fine-grained reactivity for deep objects.
 * The atoms are created on-demand and cached for those deep paths that are selected.
 * No data is duplicated - the atoms just store the version of the deep object.
 *
 * Usage:
 * ```ts
 * const { $ } = store(() => {
 *   const foo = deepMap({
 *     a: {
 *       b: 1,
 *       c: {
 *         d: 2,
 *       },
 *     },
 *   })
 *   return { foo }
 * })
 * const { a: { c: { d }, b } } = $.foo.pick(['a.c.d', 'a.b']).use()
 * $.foo.set
 * ```
 *
 * @returns An atom representing the whole object, as well as:
 * - `.pick()`, which is a select of the selected deep paths
 * - `.setDeep()`, which accepts a deep partial object and notifies the affected atoms
 */
export const deepMap = <const TValue extends Record<string, any>>(
  initialValue: TValue,
) => {
  type LegalPath = CollectPaths<TValue>

  const store = getCurrentStore()

  const pathMap: Record<string, Atom<number>> = {}

  const getDescendantPaths = (path: string[]) => {
    return Object.keys(pathMap).filter((p) => p.startsWith(path.join('/')))
  }

  const getAncestorPaths = (path: string[]) => {
    return Object.keys(pathMap).filter((p) => p.endsWith(path.join('/')))
  }

  const setDeep = (modified: Record<string, any>) => {}

  const setDeepOld = (newValue: DeepPartial<TValue>) => {
    const modifiedPaths = getLeafPaths(newValue)

    const current = rootAtom.get()
    const currentPaths = getLeafPaths(current)

    const merged = deepMerge(current, newValue)
    const mergedPaths = getLeafPaths(merged)

    const pathsToRemove = currentPaths.filter((p) => !mergedPaths.includes(p))

    console.log(currentPaths, mergedPaths, modifiedPaths)

    // const pathsToRemove = currentPaths.filter((p) => !modifiedPaths.includes(p))
    // for (const path of pathsToRemove) {
    //   delete pathMap[path]
    // }

    for (const modifiedPath of modifiedPaths) {
      const ancestorPaths = getAncestorPaths(modifiedPath.split('.'))
      const descendantPaths = getDescendantPaths(modifiedPath.split('.'))

      const pathsToNotify = [
        ...new Set([...ancestorPaths, modifiedPath, ...descendantPaths]),
      ]

      for (const path of pathsToNotify) {
        if (path in pathMap) {
          pathMap[path].set(pathMap[path].get() + 1)
        }
      }

      // const pathsToRemove = ancestorPaths.concat(descendantPaths)
      // for (const path of pathsToRemove) {
      //   delete pathMap[path]
      // }
    }

    rootAtom.set(merged)

    // console.log('--------')
    // console.log(merged)
    // console.log(pathMap)
  }

  // todo: cast to TValue to get rid of readonly?
  const rootAtom = atom(Object.freeze(initialValue))

  // todo: maybe the pick arg should be like in prisma?
  // a deep object with true for fields that should be picked
  const pickFn = <TPicked extends LegalPath[]>(
    paths: TPicked,
    { strict = true }: { strict?: boolean } = {},
  ) => {
    const current = noTrack(() => rootAtom.get())
    const obj = {}
    for (const path of paths as string[]) {
      const pathFragments = path.split('.')

      if (!pathFragments.length) {
        throw new Error('Path must have at least one fragment')
      }

      // todo: throw when path no longer exists
      // this probably happens already for deep access because of undefined

      let traversedObj = obj
      let traversedCurrent = current as Record<string, any>
      for (const fragment of pathFragments.slice(0, -1)) {
        if (strict && !(fragment in traversedCurrent)) {
          throw new Error(`Path ${path} does not exist`)
        }
        traversedObj[fragment] ??= {}
        traversedObj = traversedObj[fragment]
        traversedCurrent = traversedCurrent[fragment] ?? {}
      }
      const lastFragment = pathFragments.at(-1)!

      if (strict && !(lastFragment in traversedCurrent)) {
        throw new Error(`Path ${path} does not exist`)
      }

      traversedObj[lastFragment] = traversedCurrent[lastFragment]

      if (!(path in pathMap)) {
        assertWith<AtomInternals>(rootAtom)
        const rootName = rootAtom.getInternals().name
        setCurrentStore(store)
        pathMap[path] = atom(0).with(name(`${rootName}/${path}`))
        unsetCurrentStore()
      }

      // console.log(path, pathMap)

      // track
      pathMap[path].get()
    }
    return obj as any
  }

  const pick = select(pickFn, { dynamicDeps: true })

  return nested(rootAtom, () => ({
    pick: pick as DeepMap<TValue>['pick'],
    setDeep: setDeep as any as DeepMap<TValue>['setDeep'],
  }))
}

/*

const query = atom().with(deep())
const data = select(() => query.get(x => x.data))


*/

const deep =
  <T extends Atom<any> | Select<any, any>>() =>
  (target: T) => {
    return target
  }
