import { resolve } from 'path';
import { type Plugin, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

function stripJSDoc(): Plugin {
  return {
    name: 'strip-jsdoc',
    renderChunk(code) {
      return code.replace(/\/\*\*[\s\S]*?\*\//g, '');
    },
  };
}

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/__tests__/**'],
      tsconfigPath: './tsconfig.json',
      entryRoot: resolve(__dirname, 'src'),
      compilerOptions: { declarationMap: false, sourceMap: false },
    }),
    stripJSDoc(),
  ],
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        preserveModules: true,
        entryFileNames: (chunkInfo) => `${chunkInfo.name.replace(/^src\//, '')}.js`,
        exports: 'named',
      },
    },
    outDir: 'dist/esm',
    sourcemap: false,
    target: 'es2024',
    minify: false,
  },
});
