import { mkdir, copyFile, cp } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const output = new URL('../public/language-tools/', import.meta.url);
await mkdir(output, { recursive: true });
await cp(new URL('../node_modules/monaco-editor/min/vs/', import.meta.url), new URL('vs/', output), { recursive: true });
for (const name of ['tree-sitter.js', 'tree-sitter.wasm']) {
  await copyFile(new URL(`../node_modules/web-tree-sitter/${name}`, import.meta.url), new URL(name, output));
}
for (const name of ['c_sharp', 'php']) {
  await copyFile(new URL(`../node_modules/tree-sitter-wasms/out/tree-sitter-${name}.wasm`, import.meta.url), new URL(`${name}.wasm`, output));
}
await build({ entryPoints: [fileURLToPath(new URL('./language-worker.js', import.meta.url))], outfile: fileURLToPath(new URL('worker.js', output)), bundle: true, platform: 'browser', format: 'iife', minify: true });
