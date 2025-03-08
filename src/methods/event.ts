import { pick } from '../middleware/pick'
import { atom } from './atom'
import { nested } from './nested'

export const event = <TProps = void>() => {
  const eventAtom = atom<{ idx: number; props: TProps }>({
    idx: 0,
    props: null!,
  })

  const on = (fn: (props: TProps) => void) => {
    eventAtom.sub(() => {
      fn(eventAtom.get().props)
    })
  }

  const emit = (...args: TProps extends void ? [] : [props: TProps]) => {
    eventAtom.set({
      idx: eventAtom.get().idx + 1,
      props: args[0] as TProps,
    })
  }

  return nested(eventAtom, () => ({
    on,
    emit,
  }))
}
