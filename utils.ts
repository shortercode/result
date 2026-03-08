export function coerceError(err: unknown): Error {
  return err instanceof Error ? err : Error(String(err))
}