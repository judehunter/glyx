import { MergeParsedStoreDef, ParseStoreDef } from './utils/parseStoreDef';

export type NotFunction<T> = T extends Function ? never : T;

export type WithInternals<TTarget, TDefinition> = TTarget &
  ({} | { __glyx: TDefinition });
export type Internal<T> = Extract<T, { __glyx: any }>;
export type WithInternalsTest<T, TTest> = T & ({} | { __glyx_test: TTest });
export type InternalTest<T> = Extract<T, { __glyx_test: any }>;

export type AtomLikeMethods<T = any> = {
  get: () => T;
  use: () => T;
  set: (value: NoInfer<T>) => void;
};

export type AtomLikeMethodsGetUse<T = any> = {
  get: () => T;
  use: () => T;
};

export type AtomLikeMethodsSet<T = any> = {
  set: (value: NoInfer<T>) => void;
};

export type AtomDefinition<T = any> = {
  id: AtomId;
  initial: T;
  type: 'atom';
  injected: {
    get: () => T;
    use: () => T;
  };
};
export type SelectDefinition<
  TValue = any,
  TSelector extends (
    ...args: any
  ) => [
    get: () => TValue,
    set?: ((value: NoInfer<TValue>) => void) | undefined,
  ] = () => [() => TValue],
> = {
  id: SelectId;
  isInited: boolean;
  // selector: TSelector;
  injected: {
    getState: () => Record<string, any>;
    useStore: (selector: () => any) => Record<string, any>;
    mergeDependants: (dependants: Record<string, any>) => void;
  };
  // store:
  //   | ((atom: NoInfer<Atom<TValue>>) => Record<string, Atom | Select | Action>)
  //   | undefined;
  type: 'select';
};
export type SelectAtomLikeDefinition<TValue = any> = {
  id: SelectId;
  getIsInited: () => boolean;
  injected: {
    get: () => TValue;
    use: () => TValue;
  };
  type: 'selectAtomLike';
};

export type Atom<T = any> = WithInternals<
  AtomLikeMethods<T>,
  AtomDefinition<T>
>;

export type Select<
  TValue = any,
  TSelector extends (
    ...args: any
  ) => [
    get: () => TValue,
    set?: ((value: NoInfer<TValue>) => void) | undefined,
  ] = () => [() => TValue],
  TStore extends Record<string, Atom | Select | Action> | undefined = Record<
    string,
    any
  >,
> = WithInternals<
  (
    ...args: Parameters<TSelector>
  ) => SelectAtomLike<TValue, TSelector> &
    (TStore extends Record<any, any>
      ? MergeParsedStoreDef<ParseStoreDef<TStore>>
      : {}),
  //
  SelectDefinition<TValue, TSelector>
>;

export type SelectAtomLike<
  TValue = any,
  TSelector extends (
    ...args: any
  ) => [
    get: () => TValue,
    set?: ((value: NoInfer<TValue>) => void) | undefined,
  ] = () => [() => TValue],
> = WithInternals<
  AtomLikeMethodsGetUse<TValue> &
    (ReturnType<TSelector>[1] extends undefined
      ? {}
      : AtomLikeMethodsSet<TValue>),
  SelectAtomLikeDefinition<TValue>
>;

export type GetDefinition<TAtom> = TAtom extends Record<string, any>
  ? TAtom['__glyx']
  : never;

export type Action = (...args: any[]) => void;

export type AtomId = string & { __brand: 'AtomId' };
export type SelectId = string & { __brand: 'SelectId' };
