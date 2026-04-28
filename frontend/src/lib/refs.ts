export function byCode<T extends { code: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [x.code, x]));
}
