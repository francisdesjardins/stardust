import react from '@vitejs/plugin-react';
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
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/__tests__/**'],
      tsconfigPath: './tsconfig.json',
      entryRoot: resolve(__dirname, 'src'),
      compilerOptions: { declarationMap: false, sourceMap: false, paths: {} },
    }),
    stripJSDoc(),
  ],
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) => {
        return (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react/jsx-runtime' ||
          id.startsWith('@stardust/core')
        );
      },
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
