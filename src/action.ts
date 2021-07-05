import {GlyxAction, GlyxState, __GLYX__} from './utils';

export const action = <T extends (...args: any[]) => any>(cb: T) => {
  cb[__GLYX__] = {type: 'action'};
  return cb as GlyxAction<T>;
};

type ActionSetter<T> = T | ((current: T) => T);

// action.setter = <T>(state: GlyxState<T>) => {
//   return action((val: ActionSetter<T>) => {
//     const v = typeof val === 'function' ? ((val as any)(state.val) as T) : val;
//     state.val = v;
//   });
// };
