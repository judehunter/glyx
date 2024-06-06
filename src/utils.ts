import {
  Action,
  Atom,
  AtomMethods,
  DerivedAtom,
  GetDefinition,
  Internal,
  InternalTest,
  NestedStore,
  ValueAtom,
  WithInternalsTest,
} from './types';

export const atomStubs = {
  get: () => {
    throw new Error("Atom's get method called illegally");
  },
  set: () => {
    throw new Error("Atom's set method called illegally");
  },
  use: () => {
    throw new Error("Atom's use method called illegally");
  },
};

export const isValueAtom = <T>(atom: any): atom is Internal<ValueAtom<T>> => {
  return atom.__glyx.type === 'valueAtom';
};

export const isDerivedAtom = <T>(
  atom: any,
): atom is Internal<DerivedAtom<T>> => {
  return atom.__glyx.type === 'derivedAtom';
};

export const isAction = (value: any): value is Action => {
  return value instanceof Function;
};

export const isNestedStore = <T>(
  store: any,
): store is Internal<NestedStore<T>> => {
  return (store as any).__glyx.type === 'nestedStore';
};

export const revealInternals = <T>(val: T, path: string[]) => {
  (val as any).__glyx.path = path;
  return val as Internal<T>;
};

const __glyx_test =
  process.env.NODE_ENV === 'test'
    ? {
        test: 123,
      }
    : undefined;

const test = {
  abc: 456,
  ...__glyx_test,
};

export const revealTestInternals = <T>(val: T) => val as InternalTest<T>;

/**
 * Reverses the adjacency list of dependencies to dependants.
 */
export const dependenciesToDependants = (
  dependencies: Record<string, string[]>,
) => {
  const dependants: Record<string, string[]> = {};
  for (const [key, deps] of Object.entries(dependencies)) {
    for (const dep of deps) {
      if (!dependants[dep]) {
        dependants[dep] = [];
      }
      dependants[dep].push(key);
    }
  }
  return dependants;
};

export const getTransitiveDependants = (
  dependants: Record<string, string[]>,
  key: string,
) => {
  const result: Set<string> = new Set();
  const stack = [key];
  while (stack.length) {
    const current = stack.pop()!;
    if (result.has(current)) {
      continue;
    }
    result.add(current);
    for (const dep of dependants[current] || []) {
      stack.push(dep);
    }
  }
  result.delete(key);
  return [...result];
};

export const adjacencyListToClosureTable = (
  adjacencyList: Record<string, string[]>,
) => {
  const closureTable: [string, string][] = [];
  for (const [key, deps] of Object.entries(adjacencyList)) {
    for (const dep of deps) {
      closureTable.push([key, dep]);
    }
  }
  return closureTable;
};

export const mergeDependants = (
  a: Record<string, string[]>,
  b: Record<string, string[]>,
) => {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (!result[key]) {
      result[key] = [];
    }
    for (const v of value) {
      if (!result[key].includes(v)) {
        result[key].push(v);
      }
    }
  }
  return result;
};

// export const stubAtomMethods = (atom: Atom) => {
//   atom.get = atomStubs.get;
//   atom.set = atomStubs.set;
//   atom.use = atomStubs.use;
// };

// export const destubAtomMethods = (
//   atom: Atom,
//   {
//     get,
//     set,
//     use,
//   }: {
//     get?: () => any;
//     set?: (value: any) => void;
//     use?: () => any;
//   },
// ) => {
//   if (get) {
//     atom.get = get;
//   }
//   if (set) {
//     atom.set = set;
//   }
//   if (use) {
//     atom.use = use;
//   }
// };

// export const destubNestedStore = (
//   nestedStore: Internal<NestedStore>,
//   fn: (...args: any[]) => Record<string, Atom | NestedStore | Action>,
// ) => {
//   nestedStore.__glyx.fn = fn;
// };

export const ass = <T, TAs>(self: T, cb: (self: T) => TAs) =>
  self as any as TAs;

export const withInternalsTest = <TA, TB>(
  x: TA,
  __glyx_test: TB,
): WithInternalsTest<TA, TB> => {
  return { ...x, __glyx_test } as any;
};

export const getPath = (val: Internal<Atom | NestedStore>) => {
  if (!val.__glyx.path) {
    throw new Error("Atom's path is undefined. This shouldn't happen.");
  }
  return val.__glyx.path;
};

export const setValueByPath = (
  obj: Record<string, any>,
  path: string[],
  value: any,
) => {
  let traversed = obj;
  const copy = [...path];

  for (const [idx, fragment] of copy.entries()) {
    if (idx === copy.length) {
      traversed[fragment] = value;
    } else {
      traversed = traversed[fragment];
    }
  }
  while (true) {
    const fragment = copy[0];
    if (copy.length === 1) {
      traversed;
    }
    copy.unshift();
  }
};
