import { RefObject } from 'react'
import { callAndTrackDeps } from './deps'

export const runCustomSelector = ({
  customSelector,
  customSelectorDepsRef,
  value,
}: {
  customSelector: ((...args: any[]) => any) | undefined
  customSelectorDepsRef: RefObject<string[] | undefined>
  value: any
}) => {
  if (!customSelector) {
    customSelectorDepsRef.current ??= []
    return value
  }

  if (!customSelectorDepsRef.current) {
    const { value: selectedValue, depsList } = callAndTrackDeps(
      {
        trackDeps: true,
        // if the deps can't be tracked, then everything falls apart,
        // since the subscriber won't fire
        errorOnAlreadyTrackingDeps: true,
      },
      () => customSelector(value),
    )
    customSelectorDepsRef.current = depsList

    return selectedValue
  } else {
    return customSelector(value)
  }
}
