import * as ns from 'nanostores';
import { mapEntries } from 'radash';
import { createStore } from 'zustand/vanilla';
import {
  Atom,
  AtomFn,
  NotFunction,
  Action,
  WithDefinition,
  ValueAtomDefinition,
  DerivedAtomDefinition,
} from './types';

const atomStubs = {
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
  };
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
  const returned = definition();

  const typedEntries = Object.entries(
    returned as any as Record<string, WithDefinition<{}> | Action>,
  );

  const definitionEntries = typedEntries.filter(
    (entry): entry is [string, WithDefinition<Atom>] => '__glyx' in entry[1],
  );

  const valueAtomEntries = definitionEntries.filter(
    (entry): entry is [string, WithDefinition<Atom, ValueAtomDefinition>] =>
      entry[1].__glyx.type === 'valueAtom',
  );
  const valueAtoms = Object.fromEntries(valueAtomEntries);

  const derivedAtomEntries = definitionEntries.filter(
    (entry): entry is [string, WithDefinition<Atom, DerivedAtomDefinition>] =>
      entry[1].__glyx.type === 'derivedAtom',
  );
  const derivedAtoms = Object.fromEntries(derivedAtomEntries);

  const runAtoms = () => {
    const state: Record<string, any> = {};

    const adjacencyList: Record<string, string[]> = {};

    const atoms = [...valueAtomEntries, ...derivedAtomEntries];

    for (const [key, value] of valueAtomEntries) {
      state[key] = value.__glyx.initial;
    }

    let callee: string | null;
    for (const [name, atom] of atoms) {
      const get = () => {
        if (name in state || atom.__glyx.type === 'valueAtom') {
          return state[name];
        }
        callee = name;
        const value = atom.__glyx.get();
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

        if (name in state || atom.__glyx.type === 'valueAtom') {
          return state[name];
        }
        callee = name;
        const value = atom.__glyx.get();
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

  // const valueAtomsState = mapEntries(valueAtoms, (key, value) => [
  //   key,
  //   value.__glyx.initial,
  // ]);
  // zustandStore.setState(valueAtomsState);

  // const currentState = zustandStore.getState();

  // const derivedAtomsState = mapEntries(derivedAtoms, (key, value) => [
  //   key,
  //   value.__glyx.get(),
  // ]);

  return {
    get: () => zustandStore.getState(),
  };
};
