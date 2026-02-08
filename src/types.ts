import type * as core from '@actions/core'
import type { context } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'

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
  action_path: string
  workspace_path: string
}

/** sanitized to not include script or file values, as these aren't exposed to the program itself */
export type SanitizedInputs = Omit<Inputs, 'script' | 'file' | 'action_path' | 'workspace_path'>
