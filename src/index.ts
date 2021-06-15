import {filterObj, mapObj} from './utils';

let GET_INTERNALS: () => {state; dependents; notify} = null!;

export const createStore = <R>(definition: () => R) => {
  let listeners = [] as any[];
  const subscribe = (listener: any) => {
    listeners.push(listener);
    return () =>
      listeners.slice(
        listeners.findIndex((x) => x === listener),
        1,
      );
  };

  let state = {current: [] as any[]};
  let dependents = {current: [] as any[]};
  const notify: {current: (obj?) => any | never} = {
    current: () => {
      throw new Error('You should not modify the state during the creation of the store');
    },
  };

  GET_INTERNALS = () => ({
    state,
    dependents,
    notify,
  });

  const exposed = definition() as any;
  const exposedState = filterObj(exposed, ([, v]) => typeof v.__GLYX_STATE_IDX__ !== 'undefined');
  const exposedRest = filterObj(exposed, ([, v]) => typeof v.__GLYX_STATE_IDX__ === 'undefined');

  GET_INTERNALS = null!;

  const getState = () => {
    return mapObj(exposedState, ([k, v]) => {
      return [k, state.current[v.__GLYX_STATE_IDX__].$];
    });
  };

  notify.current = (obj) => {
    for (const l of listeners) {
      l(getState());
    }
  };

  return {getState, subscribe, ...exposedRest} as any;
};

export const state = <T>(init: T) => {
  const {state, dependents, notify} = GET_INTERNALS();

  const idx = state.current.length;
  const obj = {$: init, __GLYX_STATE_IDX__: idx};
  state.current = [...state.current, obj];

  return new Proxy(state.current[idx], {
    set: (obj, prop: string, value) => {
      obj[prop] = value;
      notify.current(obj);
      for (const d of dependents.current) {
        if (d.dependsOn === '*' || d.dependsOn.find((x) => x.__GLYX_STATE_IDX__ === idx)) {
          if (d.type === 'derived') {
            const v = d.cb();
            state.current[d.stateIdx].$ = v;
          } else if (d.type === 'watch') {
            d.cb();
          }
        }
      }
      return true;
    },
  }) as typeof obj;
};

export const action = (cb: (...args: any[]) => any) => {
  return cb;
};

export const derived = <T>(cb: () => T, deps?) => {
  const {state, dependents} = GET_INTERNALS();

  const idx = state.current.length;
  const stateObj = {$: cb(), __GLYX_STATE_IDX__: idx};
  const dependentObj = {type: 'derived', stateIdx: idx, dependsOn: deps ?? '*', cb};
  state.current = [...state.current, stateObj];
  dependents.current = [...dependents.current, dependentObj];
  return stateObj;
};

export const watch = (cb: () => any, deps?) => {
  const {dependents} = GET_INTERNALS();
  cb();
  const dependentObj = {
    type: 'watch',
    dependsOn: deps ?? '*',
    cb,
  };
  dependents.current = [...dependents.current, dependentObj];
};
