class _Brand<TBrand extends string> {
  private _brand: TBrand = null!
}

export type Brand<TBrand extends string> = InstanceType<typeof _Brand<TBrand>>

// export declare const _glyxBrand: unique symbol

// export type GlyxBrand

// type A = { a: 123 }
// class Internals<TGlyx> {
//   private _glyx: TGlyx = null!
// }

// // export type Internals<TGlyx> = InstanceType<typeof _Internals<TGlyx>>

// type GetInternals<T> = T extends Record<string, any> ? T['_glyx'] : never

// export type ExposeInternals<T> = T & GetInternals<T>

// type Testing = { abc: 123 } & Internals<{ test: 456 }>

// const a: Testing = { abc: 123, _glyx: { test: 456 } } as any as Testing
// type X = Testing['_glyx']
