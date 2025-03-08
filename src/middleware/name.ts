export const name =
  <T extends Record<string, any>>(name: string) =>
  (obj: T) => {
    ;(obj as any).setPartialInternals({ name } as any)
    return obj as any as T
  }
