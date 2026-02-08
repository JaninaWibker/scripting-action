// TODO: figure out how this could be done
import { $, chalk, fs, os, path, yaml, dotenv } from 'zx'
import type { Context, Input } from 'somewhere'

const main = async ({ github, context, core, zx }: Context, input: Input) => {
  console.log(context, input)
  return 'test'
}

export default main
