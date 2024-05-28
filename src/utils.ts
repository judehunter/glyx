import {
  Action,
  Atom,
  AtomMethods,
  DerivedAtom,
  GetDefinition,
  NestedStore,
  ValueAtom,
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

export const isValueAtom = <T>(atom: Atom<T>): atom is ValueAtom<T> => {
  return getDefinition(atom).type === 'valueAtom';
};

export const isDerivedAtom = <T>(atom: Atom<T>): atom is DerivedAtom<T> => {
  return getDefinition(atom).type === 'derivedAtom';
};

export const isAction = (value: any): value is Action => {
  return value instanceof Function;
};

export const isNestedStore = <T>(
  store: AtomMethods<T>,
): store is NestedStore<T> => {
  return (getDefinition as any)(store).type === '';
};

export const getDefinition = <T>(atom: T): GetDefinition<T> =>
  (atom as any)['__glyx'];

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

export const stubAtomMethods = (atom: Atom) => {
  atom.get = atomStubs.get;
  atom.set = atomStubs.set;
  atom.use = atomStubs.use;
};

export const destubAtomMethods = (
  atom: Atom,
  {
    get,
    set,
    use,
  }: {
    get?: () => any;
    set?: (value: any) => void;
    use?: () => any;
  },
) => {
  if (get) {
    atom.get = get;
  }
  if (set) {
    atom.set = set;
  }
  if (use) {
    atom.use = use;
  }
};
