import {GET_INTERNALS} from './internals';
import {__GLYX__, GlyxState} from './utils';

export const state = <T>(init: T) => {
  const {state, dependents, notify} = GET_INTERNALS();

  const idx = state.current.length;
  const obj = {$: init, [__GLYX__]: {type: 'state', stateIdx: idx}};
  state.current = [...state.current, obj];

  return new Proxy(state.current[idx], {
    set: (obj, prop: string, value) => {
      const previousValue = obj[prop];
      const newValue = value;
      obj[prop] = newValue;
      notify.current();
      for (const d of dependents.current) {
        if (d.dependsOn === '*' || d.dependsOn.find((x) => x[__GLYX__].stateIdx === idx)) {
          if (d.type === 'derived') {
            const v = d.cb();
            state.current[d.stateIdx].$ = v;
          } else if (d.type === 'watch') {
            d.cb(newValue, previousValue);
          }
        }
      }
      return true;
    },
  }) as GlyxState<T>;
};
