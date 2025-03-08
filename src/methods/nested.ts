import { select } from './select'

export const nested = (
  selectObj: ReturnType<typeof select>,
  nestedDef: (
    selectObj: ReturnType<ReturnType<typeof select>>,
  ) => Record<string, any>,
) => {
  const newSelectObj = (...args) => {
    const nested = nestedDef(selectObj(...args))
    return { ...selectObj(...args), ...nested }
  }

  return newSelectObj
}
