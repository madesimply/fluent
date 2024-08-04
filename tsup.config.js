import { defineConfig } from 'tsup'

const lib = {
  entry: [ 'src/index.ts' ],
  outDir: 'dist',
  dts: true,
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
}

const examples = {
  entry: [ 'examples/index.ts' ],
  outDir: 'examples/dist',
  clean: true,
}

export default defineConfig((options) => {
  const isExamples = (options?.entry || []).includes('examples');
  return isExamples ? examples : lib
})