export let TRACKING_DEPS = false

export let DEPS_LIST: string[] = []

export let NO_TRACK = false

export const callAndTrackDeps = (
  {
    trackDeps,
    errorOnAlreadyTrackingDeps = false,
  }: {
    trackDeps: boolean
    errorOnAlreadyTrackingDeps?: boolean
  },
  fn: (...args: any[]) => any,
) => {
  let isTrackingDepsNow = false
  if (trackDeps) {
    if (!TRACKING_DEPS) {
      TRACKING_DEPS = true
      DEPS_LIST = []
      isTrackingDepsNow = true
    } else if (errorOnAlreadyTrackingDeps) {
      throw new Error(
        'Already tracking deps on another function. You found a bug in Glyx.',
      )
    }
  }

  let value: any
  try {
    value = fn()
  } catch (e) {
    if (isTrackingDepsNow) {
      TRACKING_DEPS = false
      DEPS_LIST = []
      NO_TRACK = false
    }
    throw e
  }

  const depsList = isTrackingDepsNow ? [...DEPS_LIST] : undefined

  if (isTrackingDepsNow) {
    TRACKING_DEPS = false
    DEPS_LIST = []
  }

  return { value, depsList }
}

export const pushToDepsListIfTracking = (name: string) => {
  if (TRACKING_DEPS) {
    DEPS_LIST.push(name)
  }
}

export const noTrack = <T>(fn: () => T) => {
  NO_TRACK = true
  const result = fn()
  NO_TRACK = false
  return result
}

export const getNoTrack = () => NO_TRACK
