import {filterObj, mapObj} from './utils';

// declare const type: unique symbol;
const __GLYX__ = Symbol('__GLYX__');
// type Brand<Name extends string> = {readonly [__GLYX__]: Name};
type AnyFn = (...args: any[]) => any;
type GlyxMeta<T> = {readonly [__GLYX__]: T};
type GlyxState<T> = {$: T} & GlyxMeta<{type: 'state', stateIdx: number}>;
type GlyxAction<T extends AnyFn> = T & GlyxMeta<{type: 'action'}>;
type GlyxObject = GlyxState<any> | GlyxAction<AnyFn>;

type A<T> = keyof T extends infer R ? (R extends keyof T ? (T[R] extends GlyxState<any> ? R : never) : never) : never;
type GetStateFromDefinition<T extends Record<string, any>> = {[P in keyof Pick<T, A<T>>]: Pick<T, A<T>>[P]};
type TransformDefinition<T> = Omit<T, A<T>> & {getState(): GetStateFromDefinition<Pick<T, A<T>>>; subscribe: any};

const isState = (val: any): val is GlyxState<any> => {
  return val[__GLYX__]?.type === 'state'
}
const isAction = (val: any): val is GlyxState<any> => {
  return val[__GLYX__]?.type === 'action';
};

let GET_INTERNALS: () => {state; dependents; notify} = null!;

export const createStore = <T extends Record<string, GlyxObject>>(definition: () => T) => {
  let listeners = [] as any[];
  const subscribe = (listener: any) => {
    listeners.push(listener);
    return () =>
      listeners.slice(
        listeners.findIndex((x) => x === listener),
        1,
      );
  };

  let state = {current: [] as GlyxState<any>[]};
  let dependents = {current: [] as any[]};
  const notify: {current: (obj?) => any | never} = {
    current: () => {
      // throw new Error('You should not modify the state during the creation of the store');
    },
  };

  GET_INTERNALS = () => ({
    state,
    dependents,
    notify,
  });

  const exposed = definition() as any;
  const exposedState = filterObj(exposed, ([, v]) => isState(v)) as Record<string, GlyxState<any>>;
  const exposedActions = filterObj(exposed, ([, v]) => isAction(v)) as Record<string, GlyxAction<any>>;

  GET_INTERNALS = null!;

  const getState = () => {
    return mapObj(exposedState, ([k, v]) => {
      return [k, state.current[v[__GLYX__].stateIdx].$];
    });
  };

  notify.current = (obj) => {
    for (const l of listeners) {
      l(getState());
    }
  };

  return {getState, subscribe, ...exposedActions} as any as TransformDefinition<T>;
};

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

export const action = <T extends (...args: any[]) => any>(cb: T) => {
  cb[__GLYX__] = {type: 'action'};
  return cb as GlyxAction<T>;
};

export const derived = <T>(cb: () => T, deps?) => {
  const {state, dependents} = GET_INTERNALS();

  const idx = state.current.length;
  const stateObj = {$: cb(), [__GLYX__]: {type: 'state', stateIdx: idx}};
  const dependentObj = {type: 'derived', stateIdx: idx, dependsOn: deps ?? '*', cb};
  state.current = [...state.current, stateObj];
  dependents.current = [...dependents.current, dependentObj];
  return stateObj as GlyxState<T>;
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
