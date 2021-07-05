import {GET_INTERNALS} from './internals';
import {__GLYX__, GlyxState, GlyxMeta, GlyxStateGetter} from './utils';

export const state = <T>(init: T) => {
  const {state, setState} = GET_INTERNALS();

  const idx = state.current.length;
  const obj = {val: init, [__GLYX__]: {type: 'state', stateIdx: idx}} as GlyxState<T>;
  state.current = [...state.current, obj];

  const _getter = () => state.current[idx].val as T;
  const getter = _getter as GlyxStateGetter<typeof _getter>;
  getter[__GLYX__] = {type: 'state', stateIdx: idx};

  const setter = (val: T) => {
    setState.current({stateIdx: idx, val});
  };

  return [getter, setter] as const;
};
