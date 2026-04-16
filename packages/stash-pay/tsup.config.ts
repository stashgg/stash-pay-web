import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as { version: string };

const cssContent = fs.readFileSync(
  path.resolve(__dirname, 'src/styles/stash-pay.css'),
  'utf8',
);

const sharedDefine = {
  __STASH_PAY_CSS__: JSON.stringify(cssContent),
  __STASH_PAY_VERSION__: JSON.stringify(pkg.version),
};

export default defineConfig([
  // 1. React wrapper + vanilla core — ESM + CJS + .d.ts
  {
    entry: {
      index: 'src/index.ts',
      vanilla: 'src/core/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    external: ['react', 'react-dom'],
    treeshake: true,
    clean: true,
    define: sharedDefine,
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.cjs' : '.js' };
    },
  },
  // 2. UMD / IIFE — self-contained, CSS inlined, auto-injected
  {
    entry: { 'umd/stash-pay.umd': 'src/umd/entry.ts' },
    format: ['iife'],
    globalName: 'StashPay',
    minify: true,
    sourcemap: true,
    target: 'es2019',
    platform: 'browser',
    dts: false,
    noExternal: [/.*/],
    define: {
      ...sharedDefine,
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  },
  // 3. Plain CSS passthrough — keeps the subpath export stable.
  {
    entry: { 'stash-pay': 'src/styles/stash-pay.css' },
    loader: { '.css': 'copy' },
    outExtension: () => ({ js: '.css' }),
    dts: false,
  },
]);
