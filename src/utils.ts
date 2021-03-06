export const __GLYX__ = Symbol('__GLYX__');
// type Brand<Name extends string> = {readonly [__GLYX__]: Name};
export type AnyFn = (...args: any[]) => any;
export type GlyxMeta<T> = {[__GLYX__]: T};
export type GlyxStateGetter<T extends AnyFn> = T & GlyxMeta<{type: 'state'; stateIdx: number}>;
export type GlyxState<T> = {val: T} & GlyxMeta<{type: 'state'; stateIdx: number}>;
export type GlyxAction<T extends AnyFn> = T & GlyxMeta<{type: 'action'}>;
export type GlyxDeclaration = GlyxStateGetter<AnyFn> | GlyxAction<AnyFn>;

export type Ref<T> = {current: T};

export const filterObj = <T>(obj: T, cb: (val: [k: keyof T, v: T[keyof T]]) => any) => {
  return Object.fromEntries(Object.entries(obj).filter(cb as any));
};

export const mapObj = <T, R>(obj: T, cb: (val: [k: keyof T, v: T[keyof T]]) => R): R[] => {
  return Object.fromEntries(Object.entries(obj).map(cb as any)) as any;
};
