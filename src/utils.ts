export const filterObj = <T>(obj: T, cb: (val: [k: keyof T, v: T[keyof T]]) => any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(cb as any)
  );
};

export const mapObj = <T, R>(
  obj: T,
  cb: (val: [k: keyof T, v: T[keyof T]]) => R
): R[] => {
  return Object.fromEntries(Object.entries(obj).map(cb as any)) as any;
};