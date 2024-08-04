import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  const isExamples = (options?.entry || []).includes('examples');
  return {
    entry: [ 'src/index.ts' ],
    outDir: 'dist',
    dts: true,
    format: ['cjs', 'esm'],
    splitting: false,
    sourcemap: true,
    clean: true,
  }
})