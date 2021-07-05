import {GlyxState, Ref} from './utils';

export type InternalState = Ref<GlyxState<any>[]>;
export type InternalDependents = Ref<any>;
export type InternalNotify = Ref<any>;
export type InternalStateQueue = Ref<{stateIdx: number; val: any; timestamp: number}[]>;
export type InternalSetState = Ref<(item: {stateIdx: number; val: any}) => any>;

export let GET_INTERNALS: () => {
  state: InternalState;
  dependents: InternalDependents;
  notify: InternalNotify;
  setState: InternalSetState
  // stateQueue: InternalStateQueue;
} = null!;

export let SET_INTERNALS = (val: ReturnType<typeof GET_INTERNALS>) => (GET_INTERNALS = () => val);
