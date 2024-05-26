import { createStore } from 'zustand/vanilla';
import {
  Atom,
  AtomFn,
  NotFunction,
  Action,
  ValueAtom,
  DerivedAtom,
  GetDefinition,
} from './types';
import { useStore } from 'zustand';
import {
  atomStubs,
  dependenciesToDependants,
  getDefinition,
  getTransitiveDependants,
  isDerivedAtom,
  isValueAtom,
} from './utils';

const stubAtomMethods = (atom: Atom) => {
  atom.get = atomStubs.get;
  atom.set = atomStubs.set;
  atom.use = atomStubs.use;
};

export const atom: AtomFn = <T>(
  ...args: [
    initialOrGet: NotFunction<T> | (() => T) | undefined,
    set?: ((value) => void) | undefined,
  ]
) => {
  return {
    ...atomStubs,
    __glyx:
      args[0] instanceof Function ||
      (typeof args[0] === 'undefined' && args.length === 2)
        ? {
            type: 'derivedAtom',
            get: args[0],
            set: args[1],
          }
        : {
            type: 'valueAtom',
            initial: args[0],
          },
  } as any;
};

const destubAtomMethods = (
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

export const store = <TReturned extends Record<string, Atom | Action>>(
  definition: () => TReturned,
) => {
  type TAtoms = {
    [K in keyof TReturned as GetDefinition<TReturned[K]> extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? K
      : never]: TReturned[K];
  };

  type TAtomMethods = {
    [K in keyof TReturned as GetDefinition<TReturned[K]> extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? K
      : never]: TReturned[K];
  };

  type TActions = {
    [K in keyof TReturned as GetDefinition<TReturned[K]> extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? never
      : K]: TReturned[K];
  };

  const returned = definition();

  const entries = Object.entries(returned);

  const definitionEntries = entries.filter(
    (entry): entry is [string, Atom] => '__glyx' in entry[1],
  );

  const valueAtomEntries = definitionEntries.filter(
    (entry): entry is [string, ValueAtom] => isValueAtom(entry[1]),
  );
  const valueAtoms = Object.fromEntries(valueAtomEntries);

  const derivedAtomEntries = definitionEntries.filter(
    (entry): entry is [string, DerivedAtom] => isDerivedAtom(entry[1]),
  );
  const derivedAtoms = Object.fromEntries(derivedAtomEntries);

  const actionEntries = entries.filter(
    (entry): entry is [string, Action] => entry[1] instanceof Function,
  );
  const actions = Object.fromEntries(actionEntries);

  const runAtoms = () => {
    const state: Record<string, any> = {};

    const adjacencyList: Record<string, string[]> = {};

    const atoms = [...valueAtomEntries, ...derivedAtomEntries];

    for (const [key, value] of valueAtomEntries) {
      state[key] = getDefinition(value).initial;
    }

    let callee: string | null;
    for (const [name, atom] of atoms) {
      const get = () => {
        if (name in state || isValueAtom(atom)) {
          return state[name];
        }
        // possible bug:
        callee = name;
        const value = getDefinition(atom).get();
        state[name] = value;
        return value;
      };

      const use = () => {
        if (!callee) {
          throw new Error('Unreachable');
        }
        if (callee !== name) {
          // console.log(callee, name);
          if (adjacencyList[callee]) {
            adjacencyList[callee].push(name);
          } else {
            adjacencyList[callee] = [name];
          }
        }

        if (name in state || isValueAtom(atom)) {
          return state[name];
        }
        callee = name;
        const value = getDefinition(atom).get();
        state[name] = value;
        return value;
      };

      destubAtomMethods(atom, { get, use });
    }

    for (const [name, atom] of derivedAtomEntries) {
      callee = name;
      atom.get();
    }

    for (const [name, atom] of atoms) {
      stubAtomMethods(atom);
    }

    return { state, dependencies: adjacencyList };
  };

  const { state, dependencies } = runAtoms();
  const zustandStore = createStore(() => state);

  // const atomMethods =

  const dependants = dependenciesToDependants(dependencies);

  const setAtom = (name: string, value: any) => {
    const transitiveDependants = getTransitiveDependants(dependants, name);

    const transitiveDependantEntries: [string, DerivedAtom][] =
      transitiveDependants.map((key) => [key, derivedAtoms[key]]);

    const allState = zustandStore.getState();

    const state: Record<string, any> = {};
    state[name] = value;

    for (const [name, atom] of [...valueAtomEntries, ...derivedAtomEntries]) {
      const get = () => {
        return name in state ? state[name] : allState[name];
      };
      destubAtomMethods(atom, {
        get,
        use: get,
      });
    }

    for (const [name, atom] of transitiveDependantEntries) {
      state[name] = getDefinition(atom).get();
    }

    zustandStore.setState(state);

    prepareAtomsForUse();
  };

  const prepareAtomsForUse = () => {
    for (const [name, atom] of [...valueAtomEntries, ...derivedAtomEntries]) {
      const allState = zustandStore.getState();
      const get = () => {
        return allState[name];
      };
      destubAtomMethods(atom, {
        get,
        use: () => useStore(zustandStore, (s) => s[name]),
        set: (value) => setAtom(name, value),
      });
    }
  };

  prepareAtomsForUse();

  return {
    get: () => zustandStore.getState(),
    use: () => {
      return useStore(zustandStore) as any as TAtoms;
    },
    ...(actions as TActions),
    ...({ ...valueAtoms, ...derivedAtoms } as TAtoms),
  };
};
