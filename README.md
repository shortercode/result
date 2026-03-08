# @shortercode/result

Inspired by Go and Rust this is a tiny library that provides an alternative way to handle errors to `try..catch`. With only 3 core functions, and a handful of optional helpers, you won't need to read dozens of pages of docs on case specific methods you'll never use. This is an open source refinement of a battle tested design, learning from those lessons and providing you with the correct tools to get the job done.

## Installation

```sh
npm i @shortercode/result
```

## Goals

- Provide a "Result" style API with minimal complexity.
- Should work harmoniously with language features.
- Handling throwable code should be easy.
- Work great for both sync and async code.

## Example

Below is a detailed example of a small Node application that uses Results. It shows how we can create a utility for reading a JSON file and validating its contents - handling sync and async external functions that can throw and converting them into Results instead. It shows best practise for chaining Error causes using results, and how to easily handle unwrapping a result.

Some people will consider this verbose, but consider the advantages:

- Error chaining provides better context than call stacks when debugging.
- You _know_ which functions can produce errors and must explicitly handle them.
- Your errors have types instead of `any/unknown`.
- No need to use `try..catch`!

```ts
import fs from 'node:fs'
import { from, AsyncResult, Ok, Err } from '@shortercode/result'

const DEFAULT_CONFIG = {
  // .. sensible defaults if no config exists
}

async function main () {
  let {
    ok: config = DEFAULT_CONFIG,
    err: configErr
  } = await readJson('config.json', isConfigFile)

  if (configErr) {
    console.error(
      Error(
        'Unable to read config.json',
        { cause: configErr }
      )
    )
    process.exit(1)
  }

  // .. whatever the app actually does
}

type TypeGuard<T> = (value: unknown) => value is T

async function readJson <T>(
  filepath: string,
  guard: TypeGuard<T>
): AsyncResult<T | null> {
  let { ok: raw, err: readErr } = await from(
    fs.readFile(filepath, 'utf8')
  )

  if (readErr) {
    return readErr.code === 'ENOENT'
      ? Ok(null)
      : Err('Failed to read JSON file', readErr)
  }

  let { ok: content, err: parseErr } = from(
    () => JSON.parse(raw)
  )

  if (parseErr || !guard(content)) {
    return Err('Failed to parse JSON file', readErr)
  }

  return Ok(content)
}

type ConfigFile = {
  // .. whichever fields the config contains
}

function isConfigFile (data: unknown): data is ConfigFile {
  // .. type check the JSON file
}

void main()
```

## Using Result - Ok/Err

Lets start with creating a Result. Our simplest way is to use `Ok` and `Err`. These represent the success or the failure of a task respectively.

```ts
import { from, AsyncResult, Ok, Err } from '@shortercode/result'

function thing (value: number) {
  return value > 255 ? Ok(value) : Err(`Value ${value} is too large!`)
}
```

## Using Result - from

If you are handling either an existing piece of code or a library that can throw then `from` is your friend. It can take either a promise or a function. The latter is for handling a synchronous thrower, but will also accept promises.

```ts
// pass a promise
let { ok: res, err: resErr } = await from(fetch())

// ...or a function that returns a promise 
let { ok: text, err: textErr } = await from(() => res.text())

// ...or a function that might throw
let { ok: json, err: jsonErr } = from(() => JSON.parse(text))
```

You might have noticed the lack of `await` on that last line, `from` is smart and will only return a promise if it was passed something async - the return type will also reflect this.

## Using Result - unwrapping a Result

Once you have a Result you need to check if it passed or failed. The simplest way to do this is to look for a `.err`.

```ts
let example = Ok(42)

if (example.err) {
  // dang
} else {
  // yay
}
```

This also works very well with object destructuring

```ts
let { ok, err } = Ok(42)
// ..
```

Typescript is pretty smart about this, it knows that ok/err cannot be defined at the same time and so will narrow the type for you when using conditionals return etc.

## Using Result - error chains

`Error.cause` is a newish feature in the web world. It allows you to attach a parent error ( or "cause" ) to a new Error. This is an excellent way to build helpful context on your errors as the move back up the call stack. For ease of use `Err` can take a string message and a "cause", and will return a new error using those. This makes it super easy to build up an error chain, and make your debugging a lot easier!

```ts
async function readConfig () {
  let { err: readErr } = await from(readFile('config.json', 'utf8'))
  return Err('Failed to read config file', readErr)
}

async function startServer () {
  let { err: configErr } = await readConfig()
  return Err('Failed to start server', configErr)
}

let { err } = await startServer()
console.log(err)
/*
Error: Failed to start server
    at ...
  [cause]: Error: Failed to read config file
      at ...
    [cause]: Error: ENOENT: no such file or directory, open 'config.json'
        at ...
  }
}
*/
```

## Advanced Results - concurrent tasks

Sometimes your doing a bunch of things at once, and don't want to do them serially. In the promise world we have `Promise.all` and co for this. So result has them too. `Result.all` will return a single result containing either an array of all the values of the Results, or if the error of the first to fail. `Result.any` will return the first success value, or an AggregateError (an error containing a list of child errors) if they all fail.

```ts
let imageNames = ['a.jpg', 'b.jpg', 'c.jpg']

let { ok: images} = Result.all(imageNames.map(url => getImage(url)))

let { ok: avatar } = Result.any([
  getCachedAvatar(),
  getImage('avatar.jpg')
])
```

## Advanced Results - is this a Result?

A [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) is provided for checking if a value is Result shaped, its called `isResult` and works exactly like a type predicate normally works!

## Why don't you have result chaining?

Experience working with these results has shown me that any chaining design ends up with a more complex result for no gain. It's better to just work well with the tools we already have ( destructuring, type narrowing, conditionals ). I have tried a number of designs and found the _result_ lacking. If you think you have a solution please open a ticket I'm happy to discuss it.
