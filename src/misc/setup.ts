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
