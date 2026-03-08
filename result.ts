import { coerceError } from "./utils"

export type Ok<T = unknown> = { ok: T, err?: undefined }
export type Err<E extends Error = Error> = { err: E & { code?: string }, ok?: undefined }
export type Result<T = unknown, E extends Error = Error> = Ok<T> | Err<E>
export type AsyncResult<T = unknown, E extends Error = Error> = Promise<Result<T, E>>

export function Ok(): Result<void, never>
export function Ok<T>(ok: T): Result<T, never>
export function Ok<T>(ok?: T): Result<T, never> {
  return { ok: ok as T }
}

export function Err<E extends Error = Error>(err: E): Result<never, E>
export function Err(err: string, cause?: Error): Result<never>
export function Err<E extends Error = Error>(err: string | E, cause?: Error): Result<never, E> {
  return {
    err: typeof err === 'string'
      ? Error(err, { cause }) as E // won't actually be E, but this overload can't provide a custom error anyway
      : err
  }
}

export function from<T>(value: Promise<T>): AsyncResult<T>
export function from<T>(fn: () => T): Result<T>
export function from<T>(fn: () => Promise<T>): AsyncResult<T>
export function from<T>(value: Promise<T> | (() => T) | (() => Promise<T>)): AsyncResult<T> | Result<T> {
  if (typeof value === 'function') {
    try {
      const result = value()
      return result instanceof Promise ? from(result) : Ok(result)
    } catch (err) {
      return Err(coerceError(err))
    }
  }
  return value.then(ok => Ok(ok), err => Err(coerceError(err)))
}

export function all<T, E extends Error = Error>(results: AsyncResult<T, E>[]): AsyncResult<T[]>{
  return from(Promise.all(results.map(r => unwrap(r))))
}

export function any<T, E extends Error = Error>(results: AsyncResult<T, E>[]): AsyncResult<T> {
  return from(Promise.any(results.map(r => unwrap(r))))
}

export function unwrap<T, E extends Error = Error>(result: Result<T, E>): T
export function unwrap<T, E extends Error = Error>(result: AsyncResult<T, E>): Promise<T>
export function unwrap<T, E extends Error = Error>(result: Result<T, E> | AsyncResult<T, E>): T | Promise<T> {
  if (result instanceof Promise) {
    return result.then(r => unwrap(r))
  }
  const { ok, err } = result
  if (err) {
    throw err
  }
  return ok as T
}

export function isResult(value: unknown): value is Result {
  return typeof value === 'object' && value !== null && ('ok' in value || 'err' in value)
}

export const Result = {
  Ok,
  Err,
  from,
  unwrap,
  all,
  any,
  isResult
}

export default Result
