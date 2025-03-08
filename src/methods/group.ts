import { select } from './select'

export type Group<TReturn> = {
  _glyx: { type: 'group' }
} & TReturn

export const group = <TReturn extends Record<string, any>>(
  defFn: () => TReturn,
) => {
  const def = defFn()

  const selectable = Object.entries(def).filter(
    ([key, value]) =>
      '_glyx' in value && ['atom' /*'select'*/].includes(value._glyx.type),
  )

  const fn = <const TKeys extends keyof TReturn>(keys: TKeys[]) =>
    Object.fromEntries(
      selectable
        .filter(([key]) => keys.includes(key as any))
        .map(([key, value]) => [key, value.get()]),
    ) as Pick<TReturn, TKeys>

  const pick = select(fn)

  return { _glyx: { type: 'group' }, pick, ...def }
}
