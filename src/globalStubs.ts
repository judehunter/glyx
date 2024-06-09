import { Atom, Internal, NestedStore } from './types';

export const GLOBAL_GET = {
  current: (atom: Internal<Atom | NestedStore>): any => {
    if (atom.__glyx.injected) {
      return atom.__glyx.injected.get();
    }
    throw new Error("Atom's get method called illegally");
  },
};

export const GLOBAL_USE = {
  current: (atom: Internal<Atom | NestedStore>): any => {
    if (atom.__glyx.injected) {
      return atom.__glyx.injected.use();
    }
    throw new Error("Atom's use method called illegally");
  },
};
