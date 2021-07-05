import {GET_INTERNALS} from './internals';

export const watch = (cb: () => any, deps?) => {
  const {dependents} = GET_INTERNALS();
  // cb();
  const dependentObj = {
    type: 'watch',
    dependsOn: deps ?? '*',
    cb,
  };
  dependents.current = [...dependents.current, dependentObj];
};
