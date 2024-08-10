import { defineConfig } from 'tsup'

export default defineConfig(() => {
  return {
    entry: [ 'src/index.ts' ],
    outDir: 'dist',
    dts: true,
    format: ['cjs', 'esm'],
    // minify: true,
    splitting: false,
    sourcemap: true,
    clean: true,
  }
})