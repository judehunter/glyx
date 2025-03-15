import { pubsub } from '../misc/pubsub'
import { onInit } from './onInit'

/**
 * Runs the callback function whenever any of the dependencies change.
 *
 * Should not be returned.
 *
 * Usage:
 *
 * ```tsx
 * const { $ } = store(() => {
 *   const a = atom(1)
 *   const b = atom(2)
 *
 *   watch([a, b], () => {
 *     console.log('a or b changed')
 *   })
 *
 *   return { a, b }
 * })
 * ```
 *
 * @param deps - The dependencies to watch. NOTE: atoms (and derived atoms) only!
 * @param fn - The callback function to run when the dependencies change.
 */
export const watch = (deps: any[], fn: () => void) => {
  onInit(() => {
    let toSub = [] as string[]
    //TODO: USE SELECT._GLYX.DEPSLIST?
    // maybe a watch on a select doesn't even make sense? because a select runs in react
    for (const dep of deps) {
      const internals = dep.getInternals?.()
      if (internals) {
        const { type, name } = internals
        if (type === 'atom') {
          toSub.push(name)
        }
      }
    }

    pubsub.subKeys(toSub, () => {
      fn()
    })
  })
}
