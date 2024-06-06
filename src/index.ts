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
  AtomPath,
} from './types';
// import { useStore } from 'zustand';
import {
  ass,
  atomStubs,
  dependenciesToDependants,
  getPath,
  getTransitiveDependants,
  isDerivedAtom,
  isNestedStore,
  isValueAtom,
  mergeDependants,
  revealInternals,
  withInternalsTest,
} from './utils';
import zustand, { useStore } from 'zustand';
import { GLOBAL_GET, GLOBAL_USE } from './globalStubs';

export const atom: AtomFn = <T>(
  ...args: [
    initialOrGet: NotFunction<T> | (() => T) | undefined,
    set?: ((value) => void) | undefined,
  ]
) => {
  const id = Math.random().toString(36).substring(2);
  const thisAtom = {
    ...atomStubs,
    __glyx:
      args[0] instanceof Function ||
      (typeof args[0] === 'undefined' && args.length === 2)
        ? {
            type: 'derivedAtom',
            get: args[0],
            set: args[1],
            isInited: false,
            id,
          }
        : {
            type: 'valueAtom',
            initial: args[0],
            id,
          },
  } as any;

  thisAtom.get = () => GLOBAL_GET.current(thisAtom);
  thisAtom.use = () => GLOBAL_USE.current(thisAtom);

  return thisAtom;
};

const parseStoreDef = <T extends Record<string, Atom | Action>>(
  storeDefinition: T,
  path: string[] = [],
) => {
  const entries = Object.entries(storeDefinition);

  const definitionEntries = entries.filter(
    (entry): entry is [string, Atom | NestedStore] => '__glyx' in entry[1],
  );

  const valueAtomEntries = definitionEntries.flatMap((entry) => {
    const internal = revealInternals(entry[1], [...path, entry[0]]);
    if (isValueAtom(internal)) {
      return [[entry[0], internal] as [string, Internal<ValueAtom>]];
    }
    return [];
  });
  const valueAtoms = Object.fromEntries(valueAtomEntries);

  const derivedAtomEntries = definitionEntries.flatMap((entry) => {
    const internal = revealInternals(entry[1], [...path, entry[0]]);
    if (isDerivedAtom(internal)) {
      return [[entry[0], internal] as [string, Internal<DerivedAtom>]];
    }
    return [];
  });
  const derivedAtoms = Object.fromEntries(derivedAtomEntries);

  const actionEntries = entries.filter(
    (entry): entry is [string, Action] => entry[1] instanceof Function,
  );
  const actions = Object.fromEntries(actionEntries);

  const nestedStoreEntries = definitionEntries.flatMap((entry) => {
    const internal = revealInternals(entry[1], [...path, entry[0]]);
    if (isNestedStore(internal)) {
      return [[entry[0], internal] as [string, Internal<NestedStore>]];
    }
    return [];
  });
  const nestedStores = Object.fromEntries(nestedStoreEntries);

  return {
    valueAtoms,
    derivedAtoms,
    actions,
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
  type TActions = TParsedStoreDefinition['TActions'];

  const fn: Internal<NestedStore<TValue, TLocatorArgs, TStoreDefinition>> = (
    ...args: TLocatorArgs
  ) => {
    const path = getPath(fn);
    const locatorValue = fn.__glyx.locator(...args).get();

    // const map = fn.__glyx.injected.getNestedStoreState() as Map<any, any>;
    // const cached = map.get(locatorValue);
    // let locatedStoreState: any;
    // if (!cached) {
    //   locatedStoreState = fn.__glyx.store(locatorValue);
    //   map.set(locatorValue, locatedStoreState);
    //   fn.__glyx.injected.setNestedStoreState(map);
    // } else {
    //   locatedStoreState = cached;
    // }

    // this atom points to the located value
    const atom = {
      get: () => locatorValue,
      use: () => null!,
      // fn.__glyx.injected.useNestedStoreState((map) => map.get(locatorValue)),
      set: () => {},
    };

    const def = parseStoreDef(fn.__glyx.store(atom), path);

    /**
     * Collects all initial values of valueAtoms
     */
    // TODO: make sure this only runs once.
    const firstRun = () => {
      const state: Record<string, any> = {};
      for (const atom of Object.values(def.valueAtoms)) {
        const name = getPath(atom).at(-1)!;
        state[name] = atom.__glyx.initial;
      }
      for (const nestedStore of Object.values(def.nestedStores)) {
        const name = getPath(nestedStore).at(-1)!;
        state[name] = new Map();
      }
      return state;
    };
    fn.__glyx.injected.firstRun(firstRun());

    /**
     * Gets the value of a derivedAtom and
     * captures its dependencies.
     */
    const getAndTrackDerivedAtom = (derivedAtom: DerivedAtom) => {
      const allState = fn.__glyx.injected.getNestedStoreState();
      const state = new Map<string, any>();

      const newDependencies = new Map<AtomPath, AtomPath[]>();

      const atoms = { ...def.valueAtoms, ...def.derivedAtoms };

      const callStack: AtomPath[] = [];

      GLOBAL_GET.current = (atom: Internal<Atom | NestedStore>) => {
        if (
          isValueAtom(atom) ||
          (isDerivedAtom(atom) && atom.__glyx.isInited)
        ) {
          return state.get(atom) ?? atom.__glyx.getFromStore();
        }
        callStack.push(atom.__glyx.path);
        const value = atom.__glyx.get(); // TODO
        callStack.pop();
        state.set(atom, value);
        return value;
      };
      GLOBAL_USE.current = (atom: Internal<Atom | NestedStore>) => {
        const callee = callStack.at(-1);

        if (callee) {
          if (newDependencies.has(callee)) {
            newDependencies.set(callee, [
              ...newDependencies.get(callee)!,
              atom.__glyx.path,
            ]);
          } else {
            newDependencies.set(callee, [atom.__glyx.path]);
          }
        }

        if (
          isValueAtom(atom) ||
          (isDerivedAtom(atom) && atom.__glyx.isInited)
        ) {
          return state.get(atom) ?? atom.__glyx.getFromStore();
        }
        callStack.push(atom.__glyx.path);
        const value = atom.__glyx.get(); // TODO
        callStack.pop();
        state.set(atom, value);
        return value;
      };

      const value = derivedAtom.use();

      prepareAtoms();

      const newDependants = dependenciesToDependants(newDependencies);
      dependants = mergeDependants(dependants, newDependants);

      zustandStore.setState(state);

      return value;
    };

    const prepareAtoms = () => {
      for (const atom of Object.values({
        ...def.valueAtoms,
        ...def.derivedAtoms,
      })) {
        const [name] = getPath(atom);
        const allState = fn.__glyx.injected.getNestedStoreState();
        const get = () => {
          if (isDerivedAtom(atom)) {
            if (!atom.__glyx.isTracked) {
              return getAndTrackDerivedAtom(atom);
            } else if (!atom.__glyx.isInited) {
              return getDerivedAtom(atom);
            }
          }
          return allState[name];
        };
        destubAtomMethods(atom, {
          get,
          use: null!,
          // use: () => {
          //   if (isDerivedAtom(atom) && !atom.__glyx.isInited) {
          //     getAndTrackDerivedAtom(atom);
          //   }
          //   return useStore(zustandStore, (s) => s[name]);
          // },
          set: null!,
          // set: isDerivedAtom(atom)
          //   ? (value) => setDerivedAtom(atom, value)
          //   : (value) => setValueAtom(name, value),
        });
      }
    };

    prepareAtoms();

    return {
      get: fn.__glyx.injected.getNestedStoreState,
      // use: () => {
      //   getStore();
      //   return useStore(zustandStore) as any as TAtoms;
      // },
      ...(def.nestedStores as any as TNestedStores),
      ...(def.actions as TActions),
      ...({ ...def.valueAtoms, ...def.derivedAtoms } as TAtoms),
    } as any;
  };
  fn.__glyx = {
    path: null!,
    isInited: false,
    locator,
    injected: {
      getNestedStoreState: null,
      setNestedStoreState: null,
      useNestedStoreState: null,
      firstRun: null,
    },
    store: definition,
    type: 'nestedStore',
  };

  return fn;
};

// const test = nested(
//   (val: number) => ({ get: () => 5, set: (val) => {} }),
//   () => {
//     const test = atom(0);
//     return { test };
//   },
// );
// type Test = typeof test
// const test2 = revealInternals(test)

export const store = <TStoreDefinition extends Record<string, Atom | Action>>(
  definition: () => TStoreDefinition,
) => {
  type TParsedStoreDefinition = ParseStoreDef<TStoreDefinition>;
  type TAtoms = TParsedStoreDefinition['TAtoms'];
  type TNestedStores = TParsedStoreDefinition['TNestedStores'];
  type TActions = TParsedStoreDefinition['TActions'];

  const storeDefinition = definition();

  const { valueAtoms, derivedAtoms, actions, nestedStores } =
    parseStoreDef(storeDefinition);

  const root = revealInternals(
    nested(
      () => ({ get: () => undefined, set: () => {} }),
      () => storeDefinition,
    ),
    [],
  );

  const zustandStore = createStore(() => ({
    root: new Map(),
  }));
  let dependants: Map<string[], string[]> = new Map();

  root.__glyx.injected.getNestedStoreState = () => zustandStore.getState().root;
  root.__glyx.injected.setNestedStoreState = (map) => {
    zustandStore.setState({ root: map });
  };
  root.__glyx.injected.firstRun = (state: Record<string, any>) => {
    const map = zustandStore.getState().root;
    map.set(undefined, state);
    zustandStore.setState({ root: map });
  };
  // root.__glyx.injected.prepareAtoms =

  root();

  // #region old

  /**
   * Gets the value of a derivedAtom and
   * captures its dependencies.
   */
  const getAndTrackDerivedAtom = (derivedAtom: DerivedAtom) => {
    const allState = zustandStore.getState();
    const state: Record<string, any> = {};

    const newDependencies: Record<string, string[]> = {};

    const atoms = { ...valueAtoms, ...derivedAtoms };

    const callStack: string[] = [];
    for (const atom of Object.values(atoms)) {
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
    for (const atom of Object.values({ ...valueAtoms, ...derivedAtoms })) {
      const path = getPath(atom);
      const [name] = path;
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
    for (const atom of Object.values({ ...valueAtoms, ...derivedAtoms })) {
      const [name] = getPath(atom);
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
    for (const atom of Object.values(derivedAtoms)) {
      if (!atom.__glyx.isInited) {
        getAndTrackDerivedAtom(atom);
      }
    }
  };

  const getStore = () => {
    trackStore();
    return zustandStore.getState() as any as TAtoms;
  };

  const prepareNestedStoresForUse = () => {
    for (const nestedStore of Object.values(nestedStores)) {
      const path = getPath(nestedStore);
      const [name] = path;
      destubNestedStore(nestedStore, (...args) => {
        const locatorValue = nestedStore.__glyx.locator(...args).get();

        const map = zustandStore.getState()[name] as Map<any, any>;
        const cached = map.get(locatorValue);
        let locatedStoreState: any;
        if (!cached) {
          locatedStoreState = nestedStore.__glyx.store(locatorValue);
          map.set(locatorValue, locatedStoreState);
          zustandStore.setState({
            [name]: map,
          });
        } else {
          locatedStoreState = cached;
        }

        const atom = {
          get: () => locatedStoreState,
          use: () => useStore(zustandStore, (s) => s[name].get(locatorValue)),
          set: () => {},
        };

        const definition = parseStoreDef(nestedStore.__glyx.store(atom), path);

        return atom;
      });
    }
  };

  // prepareAtomsForUse();

  const __glyx_test =
    process.env.NODE_ENV === 'test'
      ? {
          get: () => zustandStore.getState(),
          getDependants: () => dependants,
        }
      : undefined!;

  // #endregion old

  return withInternalsTest(
    {
      get: getStore,
      use: () => {
        getStore();
        return useStore(zustandStore) as any as TAtoms;
      },
      ...(nestedStores as any as TNestedStores),
      ...(actions as TActions),
      ...({ ...valueAtoms, ...derivedAtoms } as TAtoms),
    },
    __glyx_test,
  );
};
