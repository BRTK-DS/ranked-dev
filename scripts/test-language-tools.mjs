import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const temp = await mkdtemp(join(tmpdir(), 'ranked-language-test-'));
await build({ entryPoints: ['lib/editor-language-services.ts'], outfile: join(temp, 'services.js'), bundle: true, platform: 'browser', format: 'iife', globalName: 'LanguageServices' });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (path === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<div id="editor" style="height:400px"></div><script src="/ranked-dev/language-tools/vs/loader.js"></script><script src="/services.js"></script><script>require.config({paths:{vs:"/ranked-dev/language-tools/vs"}});require(["vs/editor/editor.main"],()=>{window.ready=true;LanguageServices.registerXPath(monaco);});</script>'); return; }
    const file = path === '/services.js' ? join(temp, 'services.js') : path.startsWith('/monaco/') ? resolve('node_modules/monaco-editor/min', path.slice('/monaco/'.length)) : path.startsWith('/ranked-dev/language-tools/') ? resolve('public/language-tools', path.slice('/ranked-dev/language-tools/'.length)) : null;
    if (!file) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.css') ? 'text/css' : 'application/javascript');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.ready);
  const cases = [
    ['csharp', 'cs', 'using System;\npublic static class Solution { public static int Solve(int n) { throw new NotImplementedException(); } }', 'public class Solution { public int Solve( { }'],
    ['php', 'php', '<?php function solve($n) { return $n + 1; }', '<?php function solve( { return ;'],
    ['php', 'php', 'function solve($n) { return $n; }', 'function solve( {'],
    ['sql', 'sql', 'SELECT name FROM players WHERE score > 10;', 'SELECT FROM WHERE;'],
    ['graphql', 'graphql', 'query { player { id name } }', 'query { player( }'],
    ['html', 'html', '<article><h1>Hello</h1><input type="text"></article>', '<div><span></div>'],
    ['xml', 'xml', '<root><item id="1"/></root>', '<root><item></root>'],
    ['xml', 'xsl', '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out/></xsl:template></xsl:stylesheet>', '<xsl:stylesheet>'],
    ['xpath', 'xpath', '//book[@price > 10]/title/text()', '//book['],
  ];
  for (let index = 0; index < cases.length; index++) {
    const [language, extension, valid, invalid] = cases[index];
    const result = await page.evaluate(async ({language, extension, valid, invalid, index}) => {
      const model = monaco.editor.createModel(valid, language, monaco.Uri.parse(`file:///test/${index}/solution.${extension}`));
      const instance = monaco.editor.create(document.getElementById('editor'), { model });
      let status = '';
      const cleanup = LanguageServices.attachLanguageServices(monaco, instance, language, text => status = text);
      async function waitForCheck() {
        const started = Date.now();
        while (!status.startsWith('Syntax:') && !status.startsWith('Syntax unavailable')) {
          if (Date.now() - started > 20000) throw new Error(`Timeout: ${language} (${status})`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (status.startsWith('Syntax unavailable')) throw new Error(status);
      }
      await waitForCheck();
      const goodMarkers = monaco.editor.getModelMarkers({resource:model.uri});
      status = '';
      model.setValue(invalid);
      await waitForCheck();
      const badMarkers = monaco.editor.getModelMarkers({resource:model.uri});
      status = '';
      model.setValue(valid);
      await waitForCheck();
      const fixedMarkers = monaco.editor.getModelMarkers({resource:model.uri});
      cleanup(); instance.dispose(); model.dispose();
      return {goodMarkers, badMarkers, fixedMarkers};
    }, {language, extension, valid, invalid, index});
    assert.equal(result.goodMarkers.length, 0, `${language} valid: ${JSON.stringify(result.goodMarkers)}`);
    assert.ok(result.badMarkers.length > 0, `${language} should reject invalid syntax`);
    assert.equal(result.fixedMarkers.length, 0, `${language} should clear errors after correction`);
    console.log(`PASS ${language} (.${extension}): valid / invalid / correction`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  // Only this script's unique temporary bundle directory is removed.
  await rm(temp, { recursive: true, force: true });
}
