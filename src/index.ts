import {filterObj, mapObj} from './utils';

let GET_STATE: any = null;
let GET_DEPENDENTS: any = null;

export const createStore = <R>(definition: () => R) => {
  let state = {current: [] as any[]};
  let dependents = {current: [] as any[]};

  GET_STATE = () => state;
  GET_DEPENDENTS = () => dependents;

  const exposed = definition() as any;
  const exposedState = filterObj(exposed, ([, v]) => typeof v.__GLYX_STATE_IDX__ !== 'undefined');
  const exposedRest = filterObj(exposed, ([, v]) => typeof v.__GLYX_STATE_IDX__ === 'undefined');

  GET_STATE = null;
  GET_DEPENDENTS = null;

  const getState = () => {
    return mapObj(exposedState, ([k, v]) => {
      return [k, state!.current[v.__GLYX_STATE_IDX__].$];
    });
  };

  return {getState, ...exposedRest} as any;
};

export const state = <T>(init: T) => {
  const state = GET_STATE();
  const dependents = GET_DEPENDENTS();

  const idx = state.current.length;
  const obj = {$: init, __GLYX_STATE_IDX__: idx};
  state.current = [...state.current, obj];

  return new Proxy(state.current[idx], {
    set: (obj, prop: string, value) => {
      obj[prop] = value;
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
  const state = GET_STATE();
  const dependents = GET_DEPENDENTS();

  const idx = state.current.length;
  const stateObj = {$: cb(), __GLYX_STATE_IDX__: idx};
  const dependentObj = {type: 'derived', stateIdx: idx, dependsOn: deps ?? '*', cb};
  state.current = [...state.current, stateObj];
  dependents.current = [...dependents.current, dependentObj];
  return stateObj;
};

export const watch = (cb: () => any, deps?) => {
  const dependents = GET_DEPENDENTS();
  cb();
  const dependentObj = {
    type: 'watch',
    dependsOn: deps ?? '*',
    cb,
  };
  dependents.current = [...dependents.current, dependentObj];
};
