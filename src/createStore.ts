import {
  InternalDependents,
  InternalNotify,
  InternalSetState,
  InternalState,
  InternalStateQueue,
  SET_INTERNALS,
} from './internals';
import {AnyFn, filterObj, GlyxAction, GlyxDeclaration, GlyxState, GlyxStateGetter, mapObj, __GLYX__} from './utils';

type StateFromDefinition<T extends Record<string, any>> = {
  [P in keyof T as T[P] extends GlyxStateGetter<AnyFn> ? P : never]: ReturnType<T[P]>;
};
type TransformDefinition<T> = Omit<T, keyof StateFromDefinition<T>> & {
  getState(): StateFromDefinition<T>;
  subscribe: any;
};

const isStateGetter = (val: any): val is GlyxStateGetter<AnyFn> => {
  return val[__GLYX__]?.type === 'state';
};
const isAction = (val: any): val is GlyxAction<any> => {
  return val[__GLYX__]?.type === 'action';
};

export const createStore = <T extends Record<string, GlyxDeclaration>>(definition: () => T) => {
  let listeners = [] as any[];
  const subscribe = (listener: any) => {
    listeners.push(listener);
    return () =>
      listeners.splice(
        listeners.findIndex((x) => x === listener),
        1,
      );
  };

  const state = {current: []} as InternalState;
  const dependents = {current: []} as InternalDependents;
  const notify: {current: (obj?) => any | never} = {
    current: () => {},
  } as InternalNotify;

  let stateQueue = [] as {stateIdx: number; val: any}[];

  let skipCommitState = true;

  const commitState = (iteration = 0) => {
    if (skipCommitState) return;
    if (iteration >= 20) {
      throw new Error('Detected a possibly infinite state change loop');
    }

    const resolved = stateQueue.reduceRight((acc, cur) => {
      if (acc.find((x) => x.state.stateIdx === cur.stateIdx)) {
        return acc;
      }
      const oldValue = state.current[cur.stateIdx].val;
      const newValue = cur.val;
      state.current[cur.stateIdx].val = newValue;
      return [...acc, {oldValue, state: cur}];
    }, [] as {oldValue: any; state: typeof stateQueue[number]}[]);

    if (!resolved.length) return;

    stateQueue = [];

    for (const d of dependents.current) {
      let shouldRecalc =
        d.dependsOn === '*' ||
        resolved.find((item) => d.dependsOn.find((x) => x[__GLYX__].stateIdx === item.state.stateIdx));

      if (shouldRecalc) {
        if (d.type === 'derived') {
          const v = d.cb();
          state.current[d.stateIdx].val = v;
        } else if (d.type === 'watch') {
          d.cb();
        }
      }
    }

    if (stateQueue.length) commitState(iteration + 1);

    notify.current();
  };

  const setState = {
    current: (item) => {
      stateQueue.push(item);
      if (stateQueue.length === 1) {
        setTimeout(commitState);
      }
    },
  } as InternalSetState;

  SET_INTERNALS({
    state,
    dependents,
    notify,
    setState,
  });

  const exposed = definition() as any;
  const exposedState = filterObj(exposed, ([, v]) => isStateGetter(v)) as Record<string, GlyxState<any>>;
  const exposedActions = filterObj(exposed, ([, v]) => isAction(v)) as Record<string, GlyxAction<any>>;

  SET_INTERNALS(null!);

  const getState = () => {
    return mapObj(exposedState, ([k, v]) => {
      return [k, state.current[v[__GLYX__].stateIdx].val];
    });
  };

  skipCommitState = false;
  commitState();

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
