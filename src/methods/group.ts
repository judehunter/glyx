export type Group<TReturn> = {
  _glyx: { type: 'group' }
} & TReturn

export const group = <TReturn>(defFn: () => TReturn) => {
  const def = defFn()

  return { _glyx: { type: 'group' }, ...def } as Group<TReturn>
}
