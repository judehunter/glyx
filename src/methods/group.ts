import { select } from "./select"

export type Group<TReturn> = {
  _glyx: { type: 'group' }
} & TReturn

export const group = <TReturn>(defFn: () => TReturn) => {
  const def = defFn()

  // const selectable = 
  // const pick = select()

  return { _glyx: { type: 'group' }, ...def } as Group<TReturn>
}
