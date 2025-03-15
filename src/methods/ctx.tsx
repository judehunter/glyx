import React, {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { assertWith } from '../misc/utils'
import { StoreInternals } from './store'

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
    const [calledDef, setCalledDef] = useState(() => def(props))

    useEffect(() => {
      if (!calledDef) {
        // for strict mode
        setCalledDef(def(props))
      }
      return () => {
        assertWith<StoreInternals>(calledDef)
        calledDef.getInternals().destroy()
        setCalledDef(undefined!)
      }
    }, [])

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
