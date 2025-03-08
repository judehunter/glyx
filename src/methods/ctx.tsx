import { Context, createContext, ReactNode, useContext, useMemo } from 'react'

const useContextOrThrow = <T,>(context: Context<T>, name: string) => {
  const value = useContext(context)

  if (!value) {
    throw new Error(`The ${name} value for a useContext was not provided`)
  }
  return value
}

export const ctx = <TProps, TDef>(def: (props: TProps) => TDef) => {
  let name: string | undefined = undefined

  const reactCtx = createContext<TDef | undefined>(undefined)

  const Provider = (props: TProps & { children: ReactNode }) => {
    const calledDef = useMemo(() => def(props), [])

    return (
      <reactCtx.Provider value={calledDef}>{props.children}</reactCtx.Provider>
    )
  }

  Provider.ctx = reactCtx

  Provider.useOrNull = () => useContext(reactCtx)

  Provider.use = () => useContextOrThrow(reactCtx, name ?? 'Unnamed Context')

  return new Proxy(
    {},
    {
      get(target, prop) {
        name = prop.toString()
        return Provider
      },
    },
  ) as Record<string, typeof Provider> & { ['DESTRUCTURE TO USE!']: null }
}
