import {GET_INTERNALS} from './internals';
import {__GLYX__, GlyxState, GlyxStateGetter} from './utils';

export const derived = <T>(cb: () => T, deps?) => {
  const {state, dependents} = GET_INTERNALS();

  const idx = state.current.length;
  const stateObj = {val: cb(), [__GLYX__]: {type: 'state', stateIdx: idx}} as GlyxState<T>;
  const dependentObj = {type: 'derived', stateIdx: idx, dependsOn: deps ?? '*', cb};
  state.current = [...state.current, stateObj];
  dependents.current = [...dependents.current, dependentObj];

  const _getter = () => state.current[idx].val as T;
  const getter = _getter as GlyxStateGetter<typeof _getter>;
  getter[__GLYX__] = {type: 'state', stateIdx: idx};

  return getter;
};
