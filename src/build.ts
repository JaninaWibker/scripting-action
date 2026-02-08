import { randomUUIDv7 } from 'bun'

const template = (script: string) => `
import { $, chalk, fs, os, path, yaml, dotenv } from 'zx'
import type { Context, Input } from 'somewhere'

const main = async ({ github, context, core, zx }: Context, input: Input) => {
  ${script}
}

export default main
`

const transpiler = new Bun.Transpiler({ loader: 'ts' })

/** checks the script contents for parseability. if the script itself does not parse it means that there is escaping going on, therefore fail before execution */
const sanityCheck = (script: string) =>
  transpiler
    .transform(script)
    .then(() => true)
    .catch(() => false)

export const build = async (script: string, base: string) => {
  const sane = await sanityCheck(script)
  if (!sane)
    throw new Error(
      'Provided script is not parseable, likely due to escaping issues. Please check the script content and escaping.'
    )

  const scriptPath = `${base}/script-${randomUUIDv7()}.ts`

  const build = await Bun.build({
    entrypoints: [scriptPath],
    files: {
      [scriptPath]: template(script)
    },
    target: 'bun',
    format: 'esm',
    splitting: false,
    sourcemap: 'inline',
    minify: false,
    external: ['zx', 'somewhere']
  })

  const path = build.outputs.find(({ kind }) => kind === 'entry-point')!.path
  const main = (await import(path)).default

  return { path, main }
}
