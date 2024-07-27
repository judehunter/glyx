import { createStore } from 'zustand/vanilla';
import {
  NotFunction,
  Action,
  GetDefinition,
  Select,
  SelectDefinition,
  Internal,
  WithInternalsTest,
  AtomId,
  SelectId,
  Atom,
  SelectAtomLike,
} from './types';
// import { useStore } from 'zustand';
import {
  ass,
  atomStubs,
  dependenciesToDependants,
  getTransitiveDependants,
  makeAtomId,
  makeSelectId,
  mergeDependants,
  revealInternals,
  withInternalsTest,
} from './utils';
import zustand, { useStore } from 'zustand';
import { GLOBAL_GET, GLOBAL_USE } from './globalStubs';
import { isAtom, isSelect, isSelectAtomLike } from './utils/guards';
import {
  MergeParsedStoreDef,
  ParseStoreDef,
  parseStoreDef,
} from './utils/parseStoreDef';
import { mapEntries } from 'radash';

export const atom = <T>(initial: T) => {
  const thisAtom = {
    ...atomStubs,
    get: () => GLOBAL_GET.current(thisAtom),
    use: () => GLOBAL_USE.current(thisAtom),
    __glyx: {
      id: makeAtomId(),
      type: 'atom' as const,
      initial,
    },
  } as any;

  return thisAtom;
};

// const getAndTrackDerivedAtom = (derivedAtom: DerivedAtom) => {
//     const rawState = fn.__glyx.injected.getRawState();
//     const state: Record<string, any> = {};

//     const newDependencies: Record<AtomId, AtomId[]> = {};

//     const callStack: AtomId[] = [];

//     const ORIGINAL_GLOBAL_GET = GLOBAL_GET.current;
//     const ORIGINAL_GLOBAL_USE = GLOBAL_USE.current;
//     GLOBAL_GET.current = (atom: Internal<Atom | Select>) => {
//       if (isNestedStore(atom)) {
//         throw new Error('Not implemented');
//       }
//       if (
//         isValueAtom(atom) ||
//         (isDerivedAtom(atom) && atom.__glyx.isInited)
//       ) {
//         return atom.__glyx.id in state
//           ? state[atom.__glyx.id]
//           : rawState[atom.__glyx.id];
//       }
//       callStack.push(atom.__glyx.id);
//       const value = atom.__glyx.get();
//       callStack.pop();
//       state[atom.__glyx.id] = value;
//       return value;
//     };
//     GLOBAL_USE.current = (atom: Internal<Atom | Select>) => {
//       if (isNestedStore(atom)) {
//         throw new Error('Not implemented');
//       }
//       const callee = callStack.at(-1);

//       if (callee) {
//         if (callee in newDependencies) {
//           newDependencies[callee] = [
//             ...newDependencies[callee],
//             atom.__glyx.id,
//           ];
//         } else {
//           newDependencies[callee] = [atom.__glyx.id];
//         }
//       }

//       if (
//         isValueAtom(atom) ||
//         (isDerivedAtom(atom) && atom.__glyx.isInited)
//       ) {
//         return atom.__glyx.id in state
//           ? state[atom.__glyx.id]
//           : rawState[atom.__glyx.id];
//       }
//       callStack.push(atom.__glyx.id);
//       const value = atom.__glyx.get();
//       callStack.pop();
//       state[atom.__glyx.id] = value;
//       return value;
//     };

//     const value = derivedAtom.use();

//     GLOBAL_GET.current = ORIGINAL_GLOBAL_GET;
//     GLOBAL_GET.current = ORIGINAL_GLOBAL_USE;

//     const newDependants = dependenciesToDependants(newDependencies);
//     fn.__glyx.injected.mergeDependants(newDependants);

//     fn.__glyx.injected.setRawState(state);

//     return value;
//   };

//   for (const atom of Object.values({
//     ...def.derivedAtoms,
//   })) {
//     const get = () => {
//       if (!atom.__glyx.isInited) {
//         return getAndTrackDerivedAtom(atom);
//       }
//       return fn.__glyx.injected.getRawState()[atom.__glyx.id];
//     };
//     const use = () => {
//       if (!atom.__glyx.isInited) {
//         getAndTrackDerivedAtom(atom);
//       }
//       return fn.__glyx.injected.useRawState((s) => s[atom.__glyx.id]);
//     };
//     atom.__glyx.injected = {
//       get,
//       use,
//     };
//   }

export const select = <
  TValue,
  TSelectorArgs extends any[],
  TSelectorReturn,
  const TStoreDefinition extends Record<
    string,
    Select | Action
  > /*| never = never*/,
>(
  selector: (
    ...args: TSelectorArgs
  ) => TSelectorReturn &
    [get: () => TValue, set?: (value: NoInfer<TValue>) => void],
  opts: { memo: boolean },
  definition?:
    | ((atom: NoInfer<SelectAtomLike<TValue>>) => TStoreDefinition)
    | undefined,
) => {
  type TSelector = (
    ...args: TSelectorArgs
  ) => TSelectorReturn extends [
    get: () => TValue,
    set?: (value: NoInfer<TValue>) => void,
  ]
    ? TSelectorReturn
    : never;

  type TParsedStoreDefinition = ParseStoreDef<TStoreDefinition>;
  type TSelects = TParsedStoreDefinition['TSelects'];
  type TActions = TParsedStoreDefinition['TActions'];

  // const defAtomLike = {
  //   get: () => GLOBAL_GET.current(defAtomLike as any),
  //   use: () => GLOBAL_USE.current(defAtomLike as any),
  //   set: null as any,
  //   __glyx: {
  //     injected: {
  //       get: () => defAtomLike.__glyx.stack.at(-1)(),
  //     }
  //   }
  // };
  // const def = definition ? parseStoreDef(definition(defAtomLike)) : undefined;
  // console.log('def', def);

  const id = makeSelectId();

  // const flatSelects = mapEntries(def!.selects ?? [], (k, v) => [

  // ])

  // declare const registerSelector: any;

  // registerSelector(id, (parentArgs: any[], args: TSelectorArgs) => selector(...args));

  const fn: Internal<Select<TValue, TSelector, TStoreDefinition>> = (
    ...args
  ) => {
    // const selected = selector(...args);
    // const deepSelector = (deepArgs: any[][]) =>

    const thisAtomLike = {
      get: () => GLOBAL_GET.current(thisAtomLike),
      use: () => GLOBAL_USE.current(thisAtomLike),
      set: null as any,
      __glyx: {
        id,
        getIsInited: () => fn.__glyx.isInited,
        injected: {
          get: () => selector(...args)[0](),
          use: () => fn.__glyx.injected.useStore(() => selector(...args)[0]()),
        },
        type: 'selectAtomLike' as const,
      },
    } satisfies SelectAtomLike<TValue, TSelector>;

    if (!fn.__glyx.isInited) {
      const ORIGINAL_GLOBAL_GET = GLOBAL_GET.current;
      const ORIGINAL_GLOBAL_USE = GLOBAL_USE.current;

      const newDependencies: Record<AtomId, AtomId[]> = {};

      const callStack: (AtomId | SelectId)[] = [];

      GLOBAL_GET.current = (atomLike: Internal<Atom | SelectAtomLike>) => {
        const allState = fn.__glyx.injected.getState();

        if (isAtom(atomLike)) {
          return allState[atomLike.__glyx.id];
        }
        if (isSelectAtomLike(atomLike) && atomLike.__glyx.getIsInited()) {
          return ORIGINAL_GLOBAL_GET(atomLike);
        }
        callStack.push(atomLike.__glyx.id);
        const value = atomLike.__glyx.injected.get();
        callStack.pop();

        return value;
      };
      GLOBAL_USE.current = (atomLike: Internal<Atom | SelectAtomLike>) => {
        const allState = fn.__glyx.injected.getState();
        const callee = callStack.at(-1);

        if (callee) {
          if (callee in newDependencies) {
            newDependencies[callee] = [
              ...newDependencies[callee],
              atomLike.__glyx.id,
            ];
          } else {
            newDependencies[callee] = [atomLike.__glyx.id];
          }
        }

        if (isAtom(atomLike)) {
          return allState[atomLike.__glyx.id];
        }
        if (isSelectAtomLike(atomLike) && atomLike.__glyx.getIsInited()) {
          return ORIGINAL_GLOBAL_GET(atomLike);
        }
        callStack.push(atomLike.__glyx.id);
        const value = atomLike.__glyx.injected.get();
        callStack.pop();

        return value;
      };

      thisAtomLike.use();
      fn.__glyx.isInited = true;
      const newDependants = dependenciesToDependants(newDependencies);
      fn.__glyx.injected.mergeDependants(newDependants);

      GLOBAL_GET.current = ORIGINAL_GLOBAL_GET;
      GLOBAL_USE.current = ORIGINAL_GLOBAL_USE;
    }

    // defAtomLike.__glyx.injected.get =
    // for (const s of Object.values(def?.selects ?? [])) {
    //   s.__glyx.injected.
    // }

    const def = definition
      ? parseStoreDef(definition(thisAtomLike))
      : undefined;

    return {
      ...thisAtomLike,
      ...def?.actions,
      ...def?.selects,
    } as any;
  };

  fn.__glyx = {
    id,
    isInited: false,
    // selector: selector as TSelector,
    // clearCache: () => {},
    injected: {} as any,
    // test: null as any as TParsedStoreDefinition,
    // test2: null as any as Internal<Select<TValue, TSelector, TStoreDefinition>>,
    // test3: null as any as MergeParsedStoreDef<TParsedStoreDefinition>,
    // store: definition,
    type: 'select' as const,
  };

  return fn;
};

export const store = <TStoreDefinition extends Record<string, Atom | Action>>(
  definition: () => TStoreDefinition,
) => {
  type TParsedStoreDefinition = ParseStoreDef<TStoreDefinition>;
  type TAtoms = TParsedStoreDefinition['TAtoms'];
  type TSelects = TParsedStoreDefinition['TSelects'];
  type TActions = TParsedStoreDefinition['TActions'];

  const def = definition();

  const { atoms, selects, actions } = parseStoreDef(def);

  const zustandStore = createStore(() =>
    mapEntries(atoms, (k, v) => [v.__glyx.id, v.__glyx.initial]),
  );
  let dependants: Record<AtomId, AtomId[]> = {};

  for (const a of Object.values(atoms)) {
    a.__glyx.injected = {
      get: () => zustandStore.getState()[a.__glyx.id],
      use: () => {
        return zustandStore.getState()[a.__glyx.id];
      },
    };
  }

  for (const s of Object.values(selects)) {
    s.__glyx.injected = {
      getState: () => zustandStore.getState(),
      useStore: (selector) => useStore(zustandStore, selector),
      mergeDependants: (newDependants) => {
        dependants = mergeDependants(dependants, newDependants);
      },
    };
  }

  const __glyx_test =
    process.env.NODE_ENV === 'test'
      ? {
          get: () => zustandStore.getState(),
          getDependants: () => dependants,
        }
      : undefined!;

  return withInternalsTest(
    {
      // get: getStore,
      // use: () => {
      //   getStore();
      //   return useStore(zustandStore) as any as TAtoms;
      // },
      ...(actions as TActions),
      ...(atoms as TAtoms),
      ...(selects as any as TSelects),
    },
    __glyx_test,
  );
};
