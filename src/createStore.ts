import {SET_INTERNALS} from './internals';
import {filterObj, GlyxAction, GlyxObject, GlyxState, mapObj, __GLYX__} from './utils';

type StateFromDefinition<T extends Record<string, any>> = {
  [P in keyof T as T[P] extends GlyxState<any> ? P : never]: T[P]['$'];
};
type TransformDefinition<T> = Omit<T, keyof StateFromDefinition<T>> & {
  getState(): StateFromDefinition<T>;
  subscribe: any;
};

const isState = (val: any): val is GlyxState<any> => {
  return val[__GLYX__]?.type === 'state';
};
const isAction = (val: any): val is GlyxState<any> => {
  return val[__GLYX__]?.type === 'action';
};

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

  SET_INTERNALS({
    state,
    dependents,
    notify,
  });

  const exposed = definition() as any;
  const exposedState = filterObj(exposed, ([, v]) => isState(v)) as Record<string, GlyxState<any>>;
  const exposedActions = filterObj(exposed, ([, v]) => isAction(v)) as Record<string, GlyxAction<any>>;

  SET_INTERNALS(null!);

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

  return {
    getState,
    subscribe,
    ...exposedActions,
  } as any as TransformDefinition<T>;
};
