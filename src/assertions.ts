export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}
