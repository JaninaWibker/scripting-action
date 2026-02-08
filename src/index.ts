import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'
import { build } from './build'

export type Ctx = {
  github: InstanceType<typeof GitHub>
  context: typeof context
  core: typeof core
}

export type Inputs = {
  script?: string
  file?: string

  token: string
  debug: boolean

  resultEncoding: 'string' | 'json'
  inputEncoding: 'string' | 'json'
  input: unknown
}

const constructContext = (inputs: Inputs) => {
  const github = getOctokit(inputs.token, {
    log: inputs.debug ? console : undefined
  })

  return {
    github,
    context,
    core
  }
}

const main = async () => {
  const script = core.getInput('script')
  const file = core.getInput('file')

  if (!script && !file) {
    throw new Error('Missing both script and file inputs, exactly one must be set')
  }

  if (script && file) {
    throw new Error('Both script and file inputs are set, exactly one must be set')
  }

  const token = core.getInput('github-token', { required: true })
  const debug = core.getBooleanInput('debug')

  const resultEncoding = core.getInput('result-encoding')
  const inputEncoding = core.getInput('input-encoding')

  if (!['string', 'json'].includes(resultEncoding)) {
    throw new Error('result-encoding must either be "string" or "json"')
  }

  if (!['string', 'json'].includes(inputEncoding)) {
    throw new Error('input-encoding must either be "string" or "json"')
  }

  const maybeInput = core.getInput('input')
  const input = inputEncoding === 'string' ? String(maybeInput) : JSON.parse(maybeInput)

  const inputs = {
    script: file,
    token,
    debug,
    resultEncoding: resultEncoding as 'string' | 'json',
    inputEncoding: inputEncoding as 'string' | 'json',
    input
  } satisfies Inputs
  const ctx = constructContext(inputs)

  core.debug(`inputs received: ${JSON.stringify(inputs)}`)
  core.debug(`context received: ${JSON.stringify(context)}`)

  let main: ((ctx: Ctx, inputs: Inputs) => Promise<void>) | undefined = undefined

  if (script) {
    const compiled = await build(script, import.meta.dirname)
    core.debug(`Building script ${compiled.path} from input`)
    main = compiled.main
  }
  if (file) {
    core.debug(`Importing file ${file}`)
    const imported = await import(file)
    main = imported.default
  }

  if (!main) {
    throw new Error('Unknown error occured, no function found to execute')
  }

  const maybeResult = await main(ctx, inputs)

  const result = resultEncoding === 'string' ? String(maybeResult) : JSON.stringify(maybeResult)
  core.setOutput('result', result)
}

main().catch((error) => {
  console.error(error)
  core.setFailed(error)
})
