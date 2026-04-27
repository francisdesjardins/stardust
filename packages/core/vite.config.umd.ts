import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'StardustCore',
      formats: ['umd'],
      fileName: () => 'stardust-core.umd.js',
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
      },
    },
    outDir: 'dist/umd',
    sourcemap: false,
    target: 'es2024',
    minify: true,
  },
});
