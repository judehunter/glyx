import { Action, Select, Internal, Atom } from '../types';
import { revealInternals } from '../utils';
import { isAtom, isSelect } from './guards';

export const parseStoreDef = <T extends Record<string, Atom | Action>>(
  storeDefinition: T,
) => {
  const entries = Object.entries(storeDefinition);

  const definitionEntries = entries.filter(
    (entry): entry is [string, Atom | Select] => '__glyx' in entry[1],
  );

  const atomEntries = definitionEntries.flatMap((entry) => {
    const internal = revealInternals(entry[1]);
    if (isAtom(internal)) {
      return [[entry[0], internal] as [string, Internal<Atom>]];
    }
    return [];
  });
  const atoms = Object.fromEntries(atomEntries);

  const selectEntries = definitionEntries.flatMap((entry) => {
    const internal = revealInternals(entry[1]);
    if (isSelect(internal)) {
      return [[entry[0], internal] as [string, Internal<Select>]];
    }
    return [];
  });
  const selects = Object.fromEntries(selectEntries);

  const actionEntries = entries.filter(
    (entry): entry is [string, Action] =>
      entry[1] instanceof Function && !('__glyx' in entry[1]),
  );
  const actions = Object.fromEntries(actionEntries);

  return {
    atoms,
    selects,
    actions,
  };
};

export type ParseStoreDef<T extends Record<string, Atom | Select | Action>> = {
  // All: {
  //   [K in keyof T]: {
  //     val: T[K];
  //     internal: Internal<T[K]>;
  //     atom2: Internal<T[K]>['__glyx'];
  //     atom: Internal<T[K]>['__glyx'] extends {
  //       type: 'atom';
  //     }
  //       ? true
  //       : false;
  //     select: Internal<T[K]>['__glyx'] extends {
  //       type: 'select';
  //     }
  //       ? true
  //       : false;
  //     action: Internal<T[K]>['__glyx'] extends never ? true : false;
  //   };
  // };
  TAtoms: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends {
      type: 'atom';
    }
      ? Internal<T[K]>['__glyx'] extends never
        ? never
        : K
      : never]: T[K];
  };
  TSelects: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends {
      type: 'select';
    }
      ? Internal<T[K]>['__glyx'] extends never
        ? never
        : K
      : never]: T[K];
  };
  TActions: {
    [K in keyof T as Internal<T[K]>['__glyx'] extends never ? K : never]: T[K];
  };
};

export type MergeParsedStoreDef<T extends Record<string, any>> = T['TAtoms'] &
  T['TSelects'] &
  T['TActions'];
