import { atomStubs } from './utils';

export type NotFunction<T> = T extends Function ? never : T;

class GlyxObject<
  TDefinition = ValueAtomDefinition<any> | DerivedAtomDefinition<any>,
> {
  private __glyx: TDefinition = null!;
}

export type WithDefinition<
  TTarget,
  TDefinition = ValueAtomDefinition<any> | DerivedAtomDefinition<any>,
> = TTarget & InstanceType<typeof GlyxObject<TDefinition>>;

export type AtomMethods<T = any> = {
  get: () => T;
  use: () => T;
  set: (value: NoInfer<T>) => void;
};

export type ValueAtomDefinition<T = any> = { initial: T; type: 'valueAtom' };
export type DerivedAtomDefinition<T = any> = {
  get: () => T;
  set: ((value: T) => void) | undefined;
  type: 'derivedAtom';
};
export type MultiDerivedAtomDefinition<T = any, TGetArgs = any> = {
  get: () => () => T;
  set: ((value: T) => void) | undefined;

  type: 'multiDerivedAtom';
};

export type ValueAtom<T = any> = WithDefinition<
  AtomMethods<T>,
  ValueAtomDefinition<T>
>;
export type DerivedAtom<T = any> = WithDefinition<
  AtomMethods<T>,
  DerivedAtomDefinition<T>
>;
// export type NestedAtom<T = any> = WithDefinition<
//   AtomMethods<T>,

// >
export type Atom<T = any> = ValueAtom<T> | DerivedAtom<T>;

export type GetDefinition<TAtom> = TAtom extends Record<string, any>
  ? TAtom['__glyx']
  : never;

export type Action = (...args: any[]) => void;

type ValueAtomFn = <T>(initial: NotFunction<T>) => ValueAtom<T>;

type DerivedAtomFn = <T>(
  get: (() => T) | undefined,
  set?: ((value: NoInfer<T>) => void) | undefined,
) => DerivedAtom<T>;

export type AtomFn = ValueAtomFn & DerivedAtomFn;
