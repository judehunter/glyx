import {GET_INTERNALS} from './internals';
import {__GLYX__, GlyxState} from './utils';

export const derived = <T>(cb: () => T, deps?) => {
  const {state, dependents} = GET_INTERNALS();

  const idx = state.current.length;
  const stateObj = {$: cb(), [__GLYX__]: {type: 'state', stateIdx: idx}};
  const dependentObj = {type: 'derived', stateIdx: idx, dependsOn: deps ?? '*', cb};
  state.current = [...state.current, stateObj];
  dependents.current = [...dependents.current, dependentObj];
  return stateObj as GlyxState<T>;
};
