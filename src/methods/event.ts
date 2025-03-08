import { useState } from 'react'
import { useEffect } from 'react'
import { pick } from '../middleware/pick'
import { atom } from './atom'
import { nested } from './nested'
import { useStableFn } from '../misc/useStableFn'

export const event = <TProps = void>() => {
  const eventAtom = atom<{ idx: number; props: TProps }>({
    idx: 0,
    props: null!,
  })

  const on = (fn: (props: TProps) => void) => {
    return eventAtom.sub(() => {
      fn(eventAtom.get().props)
    })
  }

  const emit = (...args: TProps extends void ? [] : [props: TProps]) => {
    eventAtom.set({
      idx: eventAtom.get().idx + 1,
      props: args[0] as TProps,
    })
  }

  const useOn = (fn: (props: TProps) => void) => {
    const stabilized = useStableFn(fn)

    useEffect(() => {
      return on(stabilized)
    }, [])
  }

  return nested(eventAtom, () => ({
    on,
    useOn,
    emit,
  }))
}
