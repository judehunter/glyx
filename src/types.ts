import { atomStubs } from './utils';

export type NotFunction<T> = T extends Function ? never : T;

export type WithInternals<
  TTarget,
  TDefinition = ValueAtomDefinition<any> | DerivedAtomDefinition<any>,
> = TTarget & ({} | { __glyx: TDefinition });

export type AtomMethods<T = any> = {
  get: () => T;
  use: () => T;
  set: (value: NoInfer<T>) => void;
};

export type ValueAtomDefinition<T = any> = {
  path: string[];
  valueType?: T;
  initial: T;
  type: 'valueAtom';
};
export type DerivedAtomDefinition<T = any> = {
  id: string;
  path: string[];
  name?: T;
  // inited = has been calculated at least once
  isInited: boolean;
  // tracked = dependencies ahve been captured
  isTracked: boolean;
  get: () => T;
  set: ((value: T) => void) | undefined;
  type: 'derivedAtom';
};
export type NestedStoreDefinition<
  TValue = any,
  TLocatorArgs extends any[] = any[],
> = {
  id: string;
  path: string[];
  isInited: boolean;
  // fn: (...args: TLocatorArgs) => Record<string, Atom | NestedStore | Action>;
  locator: (...args: TLocatorArgs) => {
    get: () => TValue;
    set: ((value: NoInfer<TValue>) => void) | undefined;
  };
  injected: Record<string, any>;
  store: (
    atom: NoInfer<Atom<TValue>>,
  ) => Record<string, Atom | NestedStore | Action>;
  type: 'nestedStore';
};

export type ValueAtom<T = any> = WithInternals<
  AtomMethods<T>,
  ValueAtomDefinition<T>
>;
export type DerivedAtom<T = any> = WithInternals<
  AtomMethods<T>,
  DerivedAtomDefinition<T>
>;
export type NestedStore<
  T = any,
  TLocatorArgs extends any[] = any[],
  TStore extends Record<string, Atom | NestedStore | Action> = Record<
    string,
    any
  >,
> = WithInternals<
  (
    ...args: TLocatorArgs
  ) => AtomMethods<T> & MergeParsedStoreDefinition<ParseStoreDef<TStore>>,
  NestedStoreDefinition<T, TLocatorArgs>
>;
export type Atom<T = any> = ValueAtom<T> | DerivedAtom<T>;

export type Internal<T> = Extract<T, { __glyx: any }>;
export type WithInternalsTest<T, TTest> = T & ({} | { __glyx_test: TTest });
export type InternalTest<T> = Extract<T, { __glyx_test: any }>;

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

export type ParseStoreDef<
  T extends Record<string, Atom | NestedStore | Action>,
> = {
  TAtoms: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? K
      : never]: T[K];
  };
  TNestedStores: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends {
      type: 'nestedStore';
    }
      ? K
      : never]: T[K];
  };
  TActions: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? never
      : K]: T[K];
  };
};

type MergeParsedStoreDefinition<T extends Record<string, any>> = T['TAtoms'] &
  T['TNestedStores'] &
  T['TActions'];

export type AtomPath = string[];

export type NestedStoreLocatorArgs<T extends Record<string, any>> = Parameters<
  T['__glyx']['locator']
>;
