import { getCurrentStoreRef } from '../misc/currentStore'
import { onInit } from './onInit'

export const watch = (deps: any[], fn: () => void) => {
  onInit(({ sub }) => {
    let toSub = [] as string[]
    //TODO: USE SELECT._GLYX.DEPSLIST?
    // maybe a watch on a select doesn't even make sense? because a select runs in react
    for (const dep of deps) {
      if (dep._glyx.type === 'atom') {
        toSub.push(dep._glyx.name)
      }
    }

    sub(toSub, () => {
      fn()
    })
  })
}
