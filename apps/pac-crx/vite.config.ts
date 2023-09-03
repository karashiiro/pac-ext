import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import solidPlugin from 'vite-plugin-solid';
import zipPack from 'vite-plugin-zip-pack';
import manifest from './src/manifest';
import meta from './package.json';

export default defineConfig(() => {
  return {
    build: {
      emptyOutDir: true,
      outDir: 'build',
      target: 'esnext',
      polyfillDynamicImport: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    plugins: [
      crx({ manifest }),
      solidPlugin(),
      zipPack({
        outDir: 'package',
        inDir: 'build',
        outFileName: `pac-crx-extension-v${meta.version}.zip`,
      }),
    ],
  };
});
