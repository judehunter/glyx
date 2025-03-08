import { RefObject } from 'react'
import { callAndTrackDeps } from './deps'

export const runInlineSelector = ({
  inlineSelector,
  inlineSelectorDepsRef,
  value,
}: {
  inlineSelector: ((...args: any[]) => any) | undefined
  inlineSelectorDepsRef: RefObject<string[] | undefined>
  value: any
}) => {
  if (!inlineSelector) {
    inlineSelectorDepsRef.current ??= []
    return value
  }

  if (!inlineSelectorDepsRef.current) {
    const { value: selectedValue, depsList } = callAndTrackDeps(
      {
        trackDeps: true,
        // if the deps can't be tracked, then everything falls apart,
        // since the subscriber won't fire
        errorOnAlreadyTrackingDeps: true,
      },
      () => inlineSelector(value),
    )
    inlineSelectorDepsRef.current = depsList

    return selectedValue
  } else {
    return inlineSelector(value)
  }
}
