import { createStore } from 'zustand/vanilla';
import {
  Atom,
  AtomFn,
  NotFunction,
  Action,
  ValueAtom,
  DerivedAtom,
  GetDefinition,
  NestedStore,
  NestedStoreDefinition,
  ParseStoreDef,
  Internal,
  WithInternalsTest,
  NestedStoreLocatorArgs,
} from './types';
// import { useStore } from 'zustand';
import {
  ass,
  atomStubs,
  dependenciesToDependants,
  destubAtomMethods,
  getTransitiveDependants,
  isDerivedAtom,
  isNestedStore,
  isValueAtom,
  mergeDependants,
  revealInternals,
  stubAtomMethods,
  withInternalsTest,
} from './utils';
import zustand, { useStore } from 'zustand';

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
            isInited: false,
          }
        : {
            type: 'valueAtom',
            initial: args[0],
          },
  } as any;
};

const parseStoreDefinition = <T extends Record<string, Atom | Action>>(
  storeDefinition: T,
  path: any[] = [],
) => {
  const entries = Object.entries(storeDefinition);

  const definitionEntries = entries.filter(
    (entry): entry is [string, Atom] => '__glyx' in entry[1],
  );

  const valueAtomEntries = definitionEntries
    .filter((entry): entry is [string, ValueAtom] =>
      isValueAtom(revealInternals(entry[1])),
    )
    .map(([key, value]) => [key, revealInternals(value)] as const);
  const valueAtoms = Object.fromEntries(valueAtomEntries);

  const derivedAtomEntries = definitionEntries
    .filter((entry): entry is [string, DerivedAtom] =>
      isDerivedAtom(revealInternals(entry[1])),
    )
    .map(([key, value]) => [key, revealInternals(value)] as const);
  const derivedAtoms = Object.fromEntries(derivedAtomEntries);

  const actionEntries = entries.filter(
    (entry): entry is [string, Action] => entry[1] instanceof Function,
  );
  const actions = Object.fromEntries(actionEntries);

  const nestedStoreEntries = definitionEntries
    .filter((entry): entry is [string, NestedStore] =>
      isNestedStore(revealInternals(entry[1])),
    )
    .map(([key, value]) => [key, revealInternals(value)] as const);
  const nestedStores = Object.fromEntries(nestedStoreEntries);

  return {
    valueAtomEntries,
    valueAtoms,
    derivedAtomEntries,
    derivedAtoms,
    actionEntries,
    actions,
    nestedStoreEntries,
    nestedStores,
  };
};

export const nested = <
  TValue,
  TLocatorArgs extends any[],
  TStoreDefinition extends Record<string, DerivedAtom | NestedStore | Action>,
>(
  locator: (...args: TLocatorArgs) => {
    get: () => TValue;
    set: ((value: NoInfer<TValue>) => void) | undefined;
  },
  definition: (atom: NoInfer<Atom<TValue>>) => TStoreDefinition,
): NestedStore<TValue, TLocatorArgs, TStoreDefinition> => {
  type TParsedStoreDefinition = ParseStoreDef<TStoreDefinition>;
  type TAtoms = TParsedStoreDefinition['TAtoms'];
  type TNestedStores = TParsedStoreDefinition['TNestedStores'];
  type TNestedStoreFns = {
    [K in keyof TNestedStores]: (
      ...args: NestedStoreLocatorArgs<Internal<TNestedStores[K]>>
    ) => TNestedStores[K];
  };
  type TActions = TParsedStoreDefinition['TActions'];

  return {
    ...atomStubs,
    ...(null! as TNestedStoreFns),
    ...(null! as TActions),
    ...(null! as TAtoms),
    __glyx: {
      locator,
      store: definition,
      type: 'nestedStore',
    },
  } as any;
};

nested(
  () => ({ get: () => 5, set: (val) => {} }),
  () => {
    const test = atom(0);
    return { test };
  },
);

export const store = <TStoreDefinition extends Record<string, Atom | Action>>(
  definition: () => TStoreDefinition,
) => {
  type TParsedStoreDefinition = ParseStoreDef<TStoreDefinition>;
  type TAtoms = TParsedStoreDefinition['TAtoms'];
  type TNestedStores = TParsedStoreDefinition['TNestedStores'];
  type TNestedStoreFns = {
    [K in keyof TNestedStores]: (
      ...args: NestedStoreLocatorArgs<Internal<TNestedStores[K]>>
    ) => TNestedStores[K];
  };
  type TActions = TParsedStoreDefinition['TActions'];

  const storeDefinition = definition();

  const {
    valueAtomEntries,
    valueAtoms,
    derivedAtomEntries,
    derivedAtoms,
    actionEntries,
    actions,
    nestedStoreEntries,
    nestedStores,
  } = parseStoreDefinition(storeDefinition);

  /**
   * Collects all initial values of valueAtoms
   */
  const firstRun = () => {
    const state: Record<string, any> = {};
    for (const [key, value] of valueAtomEntries) {
      state[key] = value.__glyx.initial;
    }
    for (const [key, value] of nestedStoreEntries) {
      state[key] = new WeakMap();
    }
    return state;
  };

  const firstState = firstRun();
  const zustandStore = createStore(() => firstState);

  let dependants: Record<string, string[]> = {};

  /**
   * Gets the value of a derivedAtom and
   * captures its dependencies.
   */
  const getAndTrackDerivedAtom = (derivedAtom: DerivedAtom) => {
    const allState = zustandStore.getState();
    const state: Record<string, any> = {};

    const newDependencies: Record<string, string[]> = {};

    const atoms = [...valueAtomEntries, ...derivedAtomEntries];

    const callStack: string[] = [];
    for (const [name, atom] of atoms) {
      const get = () => {
        // valueAtoms and tracked derivedAtoms are already in the state
        if (
          isValueAtom(atom) ||
          (isDerivedAtom(atom) && atom.__glyx.isInited)
        ) {
          return name in state ? state[name] : allState[name];
        }
        callStack.push(name);
        const value = atom.__glyx.get();
        callStack.pop();
        state[name] = value;
        return value;
      };

      const use = () => {
        const callee = callStack.at(-1);

        if (callee) {
          if (newDependencies[callee]) {
            newDependencies[callee].push(name);
          } else {
            newDependencies[callee] = [name];
          }
        }

        if (
          isValueAtom(atom) ||
          (isDerivedAtom(atom) && atom.__glyx.isInited)
        ) {
          return name in state ? state[name] : allState[name];
        }
        callStack.push(name);
        const value = atom.__glyx.get();
        callStack.pop();
        state[name] = value;
        atom.__glyx.isInited = true;

        return value;
      };

      destubAtomMethods(atom, { get, use });
    }

    const value = derivedAtom.use();

    prepareAtomsForUse();

    const newDependants = dependenciesToDependants(newDependencies);
    dependants = mergeDependants(dependants, newDependants);

    zustandStore.setState(state);

    return value;
  };

  /**
   * Sets a valueAtom's value and updates all dependant atoms
   */
  const setValueAtom = (name: string, value: any) => {
    // get all atoms that will be affected by this change
    const transitiveDependants = getTransitiveDependants(dependants, name);

    const transitiveDependantEntries: [string, Internal<DerivedAtom>][] =
      transitiveDependants.map((key) => [key, derivedAtoms[key]]);

    // get all atoms as the current source of truth
    const allState = zustandStore.getState();

    // second layer of state containing the new values,
    // enabling a batch update
    const state: Record<string, any> = {};
    state[name] = value;

    // replace the getter of all atoms to use the batch state
    // or the actual state if the atom is not affected by the change
    for (const [name, atom] of [...valueAtomEntries, ...derivedAtomEntries]) {
      const get = () => {
        // use the batch state if available for this atom
        return name in state ? state[name] : allState[name];
      };
      destubAtomMethods(atom, {
        get,
        use: get,
      });
    }

    // call the getter fn of this atom, which
    // will call the destubedd getters of all dependencies
    for (const [name, atom] of transitiveDependantEntries) {
      state[name] = atom.__glyx.get();
    }

    // finally, commit the batched state
    zustandStore.setState(state);

    // go back to the "user-space" destubs
    prepareAtomsForUse();
  };

  /**
   * Calling a derived atom's set method is not any different
   * than calling an action function. Or in other words,
   * it's just a normal function that sets other atoms.
   */
  const setDerivedAtom = (atom: Internal<DerivedAtom>, value: any) => {
    const setter = atom.__glyx.set;
    // this should never happen, I think
    if (!setter) {
      throw new Error('Derived atom is read-only');
    }
    setter(value);
  };

  const prepareAtomsForUse = () => {
    for (const [name, atom] of [...valueAtomEntries, ...derivedAtomEntries]) {
      const allState = zustandStore.getState();
      const get = () => {
        if (isDerivedAtom(atom) && !atom.__glyx.isInited) {
          return getAndTrackDerivedAtom(atom);
        }
        return allState[name];
      };
      destubAtomMethods(atom, {
        get,
        use: () => {
          if (isDerivedAtom(atom) && !atom.__glyx.isInited) {
            getAndTrackDerivedAtom(atom);
          }
          return useStore(zustandStore, (s) => s[name]);
        },
        set: isDerivedAtom(atom)
          ? (value) => setDerivedAtom(atom, value)
          : (value) => setValueAtom(name, value),
      });
    }
  };

  /**
   * Init all known atoms
   */
  const trackStore = () => {
    for (const [name, atom] of derivedAtomEntries) {
      if (!atom.__glyx.isInited) {
        getAndTrackDerivedAtom(atom);
      }
    }
  };

  const getStore = () => {
    trackStore();
    return zustandStore.getState() as any as TAtoms;
  };

  const nestedStoresFns = () => {
    const fns: Record<string, (...args: any[]) => any> = {};
    for (const [key, nestedStore] of nestedStoreEntries) {
      fns[key] = (...args) => {
        const locator = nestedStore.__glyx.locator;
        const store = nestedStore.__glyx.store;
        const locatorValue = locator(...args).get();

        const weakMap = zustandStore.getState()[key] as WeakMap<any, any>;
        const cached = weakMap.get(locatorValue);
        let locatedStoreState: any;
        if (!cached) {
          locatedStoreState = store(locatorValue);
          weakMap.set(locatorValue, locatedStoreState);
          zustandStore.setState({
            [key]: weakMap,
          });
        } else {
          locatedStoreState = cached;
        }

        return locatedStoreState;
      };
    }
    return fns;
  };

  prepareAtomsForUse();

  const __glyx_test =
    process.env.NODE_ENV === 'test'
      ? {
          get: () => zustandStore.getState(),
          getDependants: () => dependants,
        }
      : undefined!;

  return withInternalsTest(
    {
      get: getStore,
      use: () => {
        getStore();
        return useStore(zustandStore) as any as TAtoms;
      },
      ...(nestedStoresFns() as TNestedStoreFns),
      ...(actions as TActions),
      ...({ ...valueAtoms, ...derivedAtoms } as TAtoms),
    },
    __glyx_test,
  );
};
