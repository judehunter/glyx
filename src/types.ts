export type NotFunction<T> = T extends Function ? never : T;

export type Atom<T = any> = {
  get: () => T;
  use: () => T;
  set: (value: NoInfer<T>) => void;
};

export type Action = (...args: any[]) => void;

export type WithDefinition<
  T,
  TDefinitionType = ValueAtomDefinition<any> | DerivedAtomDefinition<any>,
> = T & {
  __glyx: TDefinitionType;
};

export type ValueAtomDefinition<T = any> = { initial: T; type: 'valueAtom' };

export type DerivedAtomDefinition<T = any> = {
  get: () => T;
  set: ((value: T) => void) | undefined;
  type: 'derivedAtom';
};

type ValueAtomFn = <T>(initial: NotFunction<T>) => Atom<T>;

type DerivedAtomFn = <T>(
  get: (() => T) | undefined,
  set?: ((value: NoInfer<T>) => void) | undefined,
) => Atom<T>;

export type AtomFn = ValueAtomFn & DerivedAtomFn;
