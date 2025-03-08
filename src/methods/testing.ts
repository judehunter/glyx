type AllKeys<U> = U extends any ? keyof U : never;

// Next, for a given key K, extract the union of all its value types from U.
type ValueForKey<U, K extends PropertyKey> =
  U extends { [P in K]: infer V } ? V : never;

// Finally, combine them. For each key in AllKeys<U> we check if every member of U has that key.
// We do this by checking if the whole union U is assignable to Record<K, unknown>.
// - If it is, then every member has K, so the property is required.
// - Otherwise, we mark the property optional.
type CombineUnion<U> = {
  // Required keys: K is included only if every member of U has K.
  [K in AllKeys<U> as [U] extends [Record<K, unknown>] ? K : never]:
    ValueForKey<U, K>
} & {
  // Optional keys: K is included only if NOT every member of U has K.
  [K in AllKeys<U> as [U] extends [Record<K, unknown>] ? never : K]?: 
    ValueForKey<U, K>
};

type X = CombineUnion<{a: 1, c: 2} | {b: 3, c: 4}>