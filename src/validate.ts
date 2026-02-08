import * as core from '@actions/core'
import type { Inputs } from './types'

export const validateAndTransform = () => {
  const action_path = process.env.ACTION_PATH
  const workspace_path = process.env.ACTION_WORKSPACE

  if (!action_path) {
    throw new Error('Missing ACTION_PATH environment variable')
  }

  if (!workspace_path) {
    throw new Error('Missing ACTION_WORKSPACE environment variable')
  }

  const script = core.getInput('script')
  const file = core.getInput('file')

  const allInputs = Object.fromEntries(Object.entries(Object(process.env)).filter(([key]) => key.startsWith('INPUT_')))
  console.log('all inputs', allInputs)

  if (!script && !file) {
    throw new Error('Missing both script and file inputs, exactly one must be set')
  }

  if (script && file) {
    throw new Error('Both script and file inputs are set, exactly one must be set')
  }

  const token = core.getInput('token', { required: true })
  const debug = core.getBooleanInput('debug')

  const resultEncoding = core.getInput('result_encoding')
  const inputEncoding = core.getInput('input_encoding')

  if (!['string', 'json'].includes(resultEncoding)) {
    throw new Error('result-encoding must either be "string" or "json"')
  }

  if (!['string', 'json'].includes(inputEncoding)) {
    throw new Error('input-encoding must either be "string" or "json"')
  }

  const maybeInput = core.getInput('input')
  const input = inputEncoding === 'string' ? String(maybeInput) : JSON.parse(maybeInput)

  const inputs = {
    token,
    debug,
    script,
    file,
    resultEncoding: resultEncoding as 'string' | 'json',
    inputEncoding: inputEncoding as 'string' | 'json',
    input,
    action_path,
    workspace_path
  } satisfies Inputs

  return inputs
}
