export const group = (defFn: () => Record<string, any>) => {
  const def = defFn()

  return { _glyx: { type: 'group' }, ...def }
}
