import {
  Atom,
  AtomLikeMethods,
  Internal,
  Select,
  SelectAtomLike,
} from './types';

export const GLOBAL_GET = {
  current: (atomLike: Internal<Atom | SelectAtomLike>): any => {
    if (atomLike.__glyx.injected) {
      return atomLike.__glyx.injected.get();
    }
    console.log(atomLike);
    throw new Error("Atom's get method called illegally");
  },
};

export const GLOBAL_USE = {
  current: (atomLike: Internal<Atom | SelectAtomLike>): any => {
    if (atomLike.__glyx.injected) {
      return atomLike.__glyx.injected.use();
    }
    throw new Error("Atom's use method called illegally");
  },
};
