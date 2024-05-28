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
  destubAtomMethods,
  getDefinition,
  getTransitiveDependants,
  isDerivedAtom,
  isValueAtom,
  stubAtomMethods,
} from './utils';

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

type ParseStoreDefinition<T extends Record<string, Atom | Action>> = {
  TAtoms: {
    [K in keyof T as GetDefinition<T[K]> extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? K
      : never]: T[K];
  };
  // TAtomMethods: {
  //   [K in keyof T as GetDefinition<T[K]> extends {
  //     type: 'valueAtom' | 'derivedAtom';
  //   }
  //     ? K
  //     : never]: T[K];
  // };
  TActions: {
    [K in keyof T as GetDefinition<T[K]> extends {
      type: 'valueAtom' | 'derivedAtom';
    }
      ? never
      : K]: T[K];
  };
};

const parseStoreDefinition = <T extends Record<string, Atom | Action>>(
  storeDefinition: T,
  path: any[] = [],
) => {
  const entries = Object.entries(storeDefinition);

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

  return {
    valueAtomEntries,
    valueAtoms,
    derivedAtomEntries,
    derivedAtoms,
    actions,
  };
};

export const store = <TStoreDefinition extends Record<string, Atom | Action>>(
  definition: () => TStoreDefinition,
) => {
  type TParsedStoreDefinition = ParseStoreDefinition<TStoreDefinition>;
  type TAtoms = TParsedStoreDefinition['TAtoms'];
  type TActions = TParsedStoreDefinition['TActions'];

  const storeDefinition = definition();

  const {
    valueAtomEntries,
    valueAtoms,
    derivedAtomEntries,
    derivedAtoms,
    actions,
  } = parseStoreDefinition(storeDefinition);

  const firstRun = () => {
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

  const { state, dependencies } = firstRun();
  const zustandStore = createStore(() => state);

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

  const setDerivedAtom = (atom: DerivedAtom, value: any) => {
    const setter = getDefinition(atom).set;
    if (!setter) {
      throw new Error('Derived atom is read-only');
    }
    setter(value);
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
        set: isDerivedAtom(atom)
          ? (value) => setDerivedAtom(atom, value)
          : (value) => setAtom(name, value),
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
