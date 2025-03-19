export const name =
  <T extends Record<string, any>>(name: string) =>
  <T2 extends T>(obj: T2) => {
    ;(obj as any).setPartialInternals({ name } as any)
    return obj as any as T2
  }
