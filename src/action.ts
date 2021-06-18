import {GlyxAction, GlyxState, __GLYX__} from './utils';

export const action = <T extends (...args: any[]) => any>(cb: T) => {
  cb[__GLYX__] = {type: 'action'};
  return cb as GlyxAction<T>;
};

action.setter = <T>(state: GlyxState<T>) => {
  return action((val: T) => (state.$ = val));
};
