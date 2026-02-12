import path from 'node:path'
import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import * as zx from 'zx'
import { build } from './build'
import type { Ctx, Inputs, SanitizedInputs } from './types'
import { validateAndTransform } from './validate'

const constructContext = (inputs: Inputs) => {
  const github = getOctokit(inputs.token, {
    log: inputs.debug ? console : undefined
  })

  return {
    github,
    context,
    core,
    zx
  }
}

const main = async () => {
  const inputs = validateAndTransform()

  const ctx = constructContext(inputs)

  core.debug(`inputs received: ${JSON.stringify(inputs)}`)
  core.debug(`context received: ${JSON.stringify(context)}`)

  type Entrypoint = (ctx: Ctx, inputs: SanitizedInputs) => Promise<void>

  let main: Entrypoint | undefined

  if (inputs.script) {
    const base = path.join(inputs.action_path, 'runtime')
    const compiled = await build(inputs.script, base)
    core.debug(`Building script ${compiled.path} from input`)
    main = compiled.main
  }
  if (inputs.file) {
    const importPath = path.resolve(inputs.workspace_path, inputs.file)
    core.debug(`Importing file ${importPath}`)
    const imported = await import(importPath)
    main = imported.default
  }

  if (!main) {
    throw new Error('Unknown error occured, no function found to execute')
  }

  // sanitized only refers to a few values which are not passed along, but they don't have any sensative information.
  // the values just don't get included because they don't make sense to include here
  const sanitizedInputs = {
    token: inputs.token,
    debug: inputs.debug,
    script: inputs.script,
    file: inputs.file,
    resultEncoding: inputs.resultEncoding,
    inputEncoding: inputs.inputEncoding,
    input: inputs.input
  }
  const maybeResult = await main(ctx, sanitizedInputs)

  const result = inputs.resultEncoding === 'string' ? String(maybeResult) : JSON.stringify(maybeResult)
  core.setOutput('result', result)
}

main().catch((error) => {
  console.error(error)
  core.setFailed(error)
})
