import { Action, Atom, Internal, Select, SelectAtomLike } from '../types';

export const isAtom = <T>(val: any): val is Internal<Atom<T>> => {
  return val.__glyx.type === 'atom';
};

export const isAction = (val: any): val is Action => {
  return val instanceof Function;
};

export const isSelect = <T>(val: any): val is Internal<Select<T>> => {
  return (val as any).__glyx.type === 'select';
};

export const isSelectAtomLike = <T>(
  val: any,
): val is Internal<SelectAtomLike<T>> => {
  return (val as any).__glyx.type === 'selectAtomLike';
};
