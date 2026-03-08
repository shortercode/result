import { describe, it, expect } from "vitest"
import { Ok, Err, from, all, any, isResult, Result } from "./result"

describe("Ok", () => {
  it("should create an Ok result with a value", () => {
    const { ok, err } = Ok(42)
    expect(ok).toBe(42)
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with void", () => {
    const { ok, err } = Ok()
    expect(ok).toBeUndefined()
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with a string value", () => {
    const { ok, err } = Ok("hello")
    expect(ok).toBe("hello")
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with null", () => {
    const { ok, err } = Ok(null)
    expect(ok).toBeNull()
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with an object", () => {
    const obj = { foo: "bar" }
    const { ok, err } = Ok(obj)
    expect(ok).toBe(obj)
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with false", () => {
    const { ok, err } = Ok(false)
    expect(ok).toBe(false)
    expect(err).toBeUndefined()
  })

  it("should create an Ok result with 0", () => {
    const { ok, err } = Ok(0)
    expect(ok).toBe(0)
    expect(err).toBeUndefined()
  })

  it("should allow a Ok within an Ok", () => {
    const innerResult = Ok(42)
    const { ok, err } = Ok(innerResult)
    expect(ok).toBe(innerResult)
    expect(err).toBeUndefined()
  })

  it("should allow a Err within an Ok", () => {
    const innerResult = Err("error")
    const { ok, err } = Ok(innerResult)
    expect(ok).toBe(innerResult)
    expect(err).toBeUndefined()
  })
})

describe("Err", () => {
  it("should create an Err result from an Error instance", () => {
    const error = new Error("something went wrong")
    const { ok, err } = Err(error)
    expect(err).toBe(error)
    expect(ok).toBeUndefined()
  })

  it("should create an Err result from a string", () => {
    const { ok, err } = Err("something went wrong")
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("something went wrong")
    expect(ok).toBeUndefined()
  })

  it("should create an Err result from a string with a cause", () => {
    const cause = new Error("root cause")
    const { ok, err } = Err("something went wrong", cause)
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("something went wrong")
    expect(err?.cause).toBe(cause)
    expect(ok).toBeUndefined()
  })

  it("should create an Err result from a custom Error subclass", () => {
    class CustomError extends Error {
      code = "CUSTOM"
    }
    const error = new CustomError("custom error")
    const { ok, err } = Err(error)
    expect(err).toBe(error)
    expect(err?.code).toBe("CUSTOM")
    expect(ok).toBeUndefined()
  })

  it("should create an Err result from a TypeError", () => {
    const error = new TypeError("type error")
    const { ok, err } = Err(error)
    expect(err).toBeInstanceOf(TypeError)
    expect(err?.message).toBe("type error")
    expect(ok).toBeUndefined()
  })
})

describe("from", () => {
  it("should wrap a synchronous function returning a value in Ok", () => {
    const { ok, err } = from(() => 42)
    expect(ok).toBe(42)
    expect(err).toBeUndefined()
  })

  it("should wrap a synchronous function that throws in Err", () => {
    const { ok, err } = from(() => {
      throw new Error("sync error")
    })
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("sync error")
    expect(ok).toBeUndefined()
  })

  it("should wrap a synchronous function that throws a non-Error in Err", () => {
    const { ok, err } = from(() => {
      throw "string error"
    })
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("string error")
    expect(ok).toBeUndefined()
  })

  it("should wrap a resolved promise in Ok", async () => {
    const { ok, err } = await from(Promise.resolve(42))
    expect(ok).toBe(42)
    expect(err).toBeUndefined()
  })

  it("should wrap a rejected promise in Err", async () => {
    const { ok, err } = await from(Promise.reject(new Error("async error")))
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("async error")
    expect(ok).toBeUndefined()
  })

  it("should wrap an async function returning a value in Ok", async () => {
    const { ok, err } = await from(async () => 42)
    expect(ok).toBe(42)
    expect(err).toBeUndefined()
  })

  it("should wrap an async function that rejects in Err", async () => {
    const { ok, err } = await from(async () => {
      throw new Error("async fn error")
    })
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("async fn error")
    expect(ok).toBeUndefined()
  })

  it("should handle a rejected promise with a non-Error rejection", async () => {
    const { ok, err } = await from(Promise.reject("string rejection"))
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("string rejection")
    expect(ok).toBeUndefined()
  })

  it("should handle a synchronous function returning undefined", () => {
    const { ok, err } = from(() => undefined)
    expect(ok).toBeUndefined()
    expect(err).toBeUndefined()
  })
})

describe("all", () => {
  it("should return Ok with all values when all results are Ok", async () => {
    const results = [
      Promise.resolve(Ok(1)),
      Promise.resolve(Ok(2)),
      Promise.resolve(Ok(3)),
    ]
    const result = await all(results)
    expect(result.ok).toEqual([1, 2, 3])
    expect(result.err).toBeUndefined()
  })

  it("should return Err when any result is Err", async () => {
    const results = [
      Promise.resolve(Ok(1)),
      Promise.resolve(Err("fail")),
      Promise.resolve(Ok(3)),
    ]
    const result = await all(results)
    expect(result.err).toBeInstanceOf(Error)
    expect(result.ok).toBeUndefined()
  })

  it("should return Ok with empty array when given no results", async () => {
    const result = await all([])
    expect(result.ok).toEqual([])
    expect(result.err).toBeUndefined()
  })

  it("should return the first Err when multiple results are Err", async () => {
    const results = [
      Promise.resolve(Err("first error")),
      Promise.resolve(Err("second error")),
    ]
    const result = await all(results)
    expect(result.err).toBeInstanceOf(Error)
    expect(result.ok).toBeUndefined()
  })
})

describe("any", () => {
  it("should return Ok with the first resolved value", async () => {
    const results = [
      Promise.resolve(Ok(1)),
      Promise.resolve(Ok(2)),
      Promise.resolve(Ok(3)),
    ]
    const result = await any(results)
    expect(result.ok).toBe(1)
    expect(result.err).toBeUndefined()
  })

  it("should return Ok if at least one result is Ok", async () => {
    const results = [
      Promise.resolve(Err("fail 1")),
      Promise.resolve(Ok(42)),
      Promise.resolve(Err("fail 2")),
    ]
    const result = await any(results)
    expect(result.ok).toBe(42)
    expect(result.err).toBeUndefined()
  })

  it("should return Err when all results are Err", async () => {
    const results = [
      Promise.resolve(Err("fail 1")),
      Promise.resolve(Err("fail 2")),
    ]
    const result = await any(results)
    expect(result.err).toBeInstanceOf(Error)
    expect(result.ok).toBeUndefined()
  })

  it("should return Err when given empty array", async () => {
    const result = await any([])
    expect(result.err).toBeInstanceOf(Error)
    expect(result.ok).toBeUndefined()
  })
})

describe("isResult", () => {
  it("should return true for Ok result", () => {
    expect(isResult(Ok(42))).toBe(true)
  })

  it("should return true for Err result", () => {
    expect(isResult(Err("error"))).toBe(true)
  })

  it("should return true for an object with ok property", () => {
    expect(isResult({ ok: "value" })).toBe(true)
  })

  it("should return true for an object with err property", () => {
    expect(isResult({ err: new Error() })).toBe(true)
  })

  it("should return false for null", () => {
    expect(isResult(null)).toBe(false)
  })

  it("should return false for undefined", () => {
    expect(isResult(undefined)).toBe(false)
  })

  it("should return false for a string", () => {
    expect(isResult("hello")).toBe(false)
  })

  it("should return false for a number", () => {
    expect(isResult(42)).toBe(false)
  })

  it("should return false for an empty object", () => {
    expect(isResult({})).toBe(false)
  })

  it("should return false for an array", () => {
    expect(isResult([1, 2, 3])).toBe(false)
  })

  it("should return true for an object with both ok and err", () => {
    expect(isResult({ ok: 1, err: new Error() })).toBe(true)
  })
})

describe("Result namespace", () => {
  it("should expose Ok", () => {
    expect(Result.Ok).toBe(Ok)
  })

  it("should expose Err", () => {
    expect(Result.Err).toBe(Err)
  })

  it("should expose from", () => {
    expect(Result.from).toBe(from)
  })

  it("should expose all", () => {
    expect(Result.all).toBe(all)
  })

  it("should expose any", () => {
    expect(Result.any).toBe(any)
  })
})