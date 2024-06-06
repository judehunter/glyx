import { Atom, Internal, NestedStore } from './types';

export const GLOBAL_GET = {
  current: (atom: Internal<Atom | NestedStore>): any => {
    throw new Error("Atom's get method called illegally");
  },
};

export const GLOBAL_USE = {
  current: (atom: Internal<Atom | NestedStore>): any => {
    throw new Error("Atom's use method called illegally");
  },
};
