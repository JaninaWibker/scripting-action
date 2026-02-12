# scripting-action

Proper scripting with TypeScript in Github Actions using bun.
Includes sane defaults, useful helpers, an authenticated octokit instance and other useful integrations.

Inspired by [actions/github-script](https://github.com/actions/github-script/).

## Usage

```yaml
- uses: 'JaninaWibker/scripting-action@main'
  id: 'using-file'
  with:
    token: '${{ secrets.GITHUB_TOKEN }}'
    input-encoding: 'string' # can also be 'json'
    input: 'this is passed to the script'
    file: './.github/scripts/script.ts' # relative to root of the repo, ran with `./github/workflows` as cwd

  # result available via steps.using-file.outputs.result

  # --- or ---

- uses: 'JaninaWibker/scripting-action@main'
  id: 'using-inline'
  with:
    token: '${{ secrets.GITHUB_TOKEN }}'
    input-encoding: 'string' # can also be 'json'
    input: 'this is passed to the script'
    script: |
      todo()

  # result available via steps.using-inline.outputs.result
```

## Action inputs and outputs


### `file` and `script`

Both `file` and `script` are valid options for specifying what to run.
Exactly one of both needs to be set, otherwise the action will throw an error and fail.

For convenience the body of `script` already has a few variables set.
This is not done for `file` as this inhibits LSP functionality.

Using `file` requires doing a checkout beforehand.

Consider the security implications of this when using certain workflow types such as `workflow_dispatch` and `issue_comment`, which are typically referencing the workflow in the default branch but will run code of the related ref using checkout + `file`.

**`file`**:
- **Pro**: LSP support, easier to run locally, workflow is easier to read / reason about 
- **Con**: Requires checkout, security considerations (likely not applicable)

**`script`**:
- **Pro**: Very easy to get started with, no checkout required
- **Con**: Can get lengthy and messy with long scripts and complex workflows

The pros and cons of each equal out in the end: Switching from `script` to `file` because of increasing complexity is easy, doesn't require any meaningful changes and if needed can also be reverted easily.

```yaml
with:
  result_encoding: 'json'
  script: |
    console.log('hello world')

    return { 'key': 'value' }
```

or using `file`:

```yaml
with:
  result_encoding: 'json'
  file: './.github/scripts/script.ts'
```

with `./.github/scripts/script.ts` looking like this:

```ts
import type { Context, Input } from 'somewhere'

const main = async ({ github, context, core, zx }: Context, input: Input) => {
  console.log(context, input)
  return { 'key': 'value' }
}

export default main
```


### `input` and `input_encoding`

`input` is a convention for passing in inputs to the script.
There are many ways to achieve this and a method which doesn't require any support from the action would be environment variables.
To standardize this a bit the `input` parameter has been added, but environment variables can of course also be used.

```yaml
with:
  input: 'hello world'
  input_encoding: 'string'

# --- or ---

with:
  input: '{ "key": "value" }'
  input_encoding: 'json'
```

`input` can either be a string or JSON, which is used is decided by `input_encoding` (`'string' | 'json'`, defaults to `'string'`).
JSON inputs are automatically parsed with `JSON.parse`.

> [!CAUTION]
> Don't use the GitHub action templating in combination with `script` to input values unless you really know what you are doing.
> This is a surefire to introduce code injection.


### `result` and `result_encoding`

Similar in nature to `input` and `input_encoding`, but this time for outputs.

```yaml
with:
  result_encoding: 'string'

# --- or ---

with:
  result_encoding: 'json'
```

To keep in line with [actions/github-script](https://github.com/actions/github-script/) the output is called `result`.
`result_encoding` decides what to do with the output:
- `'string'`: Keep as is
- `'json'`: Pass to `JSON.stringify`


### misc: `token` and `debug`

```yaml
with:
  token: '${{ secrets.GITHUB_TOKEN }}'
```

To create an authenticated octokit instance a `token` is needed.
This will most likely be `secrets.GITHUB_TOKEN`, but can also be a PAT or a GitHub App token.

```yaml
with:
  debug: true
```

To enable debug logging use the `debug` value.


## Scripting

This is very much similar to what [actions/github-script](https://github.com/actions/github-script/) does, but improved.

The most important differences are that:

1. you can write TypeScript instead of JavaScript,
2. the usage of bun,
3. and the inclusion of [zx](https://google.github.io/zx/),
4. the built-in ability to use a file instead of inlining the script.

The behavior of `script` and `file` differ slightly. While `file` expects a default export of a function which takes `Context` and `Inputs` as arguments the code handling this is automatically added to the contents of `script`.

The `result` of the action is the return value in both cases, with `script` allowing a "top level return statement" while `file` uses the return value of the previously described function.


### What is `Context`?

A combination of the following:
- `github`: pre-authenticated instance of octokit. Example: `github.rest.issues.createComment({ ... })`
- `context`: context object for the workflow run. Example: `context.eventName === 'workflow_dispatch'`
- `core`: instance of `@actions/core`. Example: `core.notice('Something happened')`
- `zx`: The [zx library](https://google.github.io/zx/) as asterisk import. Example `zx.$\`git commit {...}\``


### What is `Inputs`?

Most importantly contains the `input` property, which can be passed in via the `input` argument of the action. Other than that `token`, `debug`, `inputEncoding` and `resultEncoding` are also provided, but probably of lesser importance.


### Dealing with dependencies

Given that `JaninaWibker/scripting-action` is a composite action and therefore runs as a step instead of as a job it is possible to install any dependencies you'd need before.
Just make sure that the `node_modules` folder gets picked up.
The following locations can be used:

- `${{ github.workspace }}/node_modules`
- `${{ github.workspace }}/.github/node_modules`
- `${{ github.workspace }}/.github/workflows/node_modules`

You can set the `NODE_PATH` variable to modify this behavior.
This variable is also used internally and the above paths are appended to it.
