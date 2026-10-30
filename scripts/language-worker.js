import { parse as parseGraphQL } from 'graphql/language/parser';
import { Parser as SQLParser } from 'node-sql-parser/build/mysql';
import { HtmlValidate } from 'html-validate/browser';

let runtime;
const grammars = new Map();
async function treeParser(language) {
  if (!runtime) {
    importScripts('./tree-sitter.js');
    runtime = self.TreeSitter.init({ locateFile: name => new URL(name, self.location.href).href });
  }
  await runtime;
  const name = language === 'csharp' ? 'c_sharp' : 'php';
  if (!grammars.has(name)) grammars.set(name, self.TreeSitter.Language.load(new URL(`${name}.wasm`, self.location.href).href));
  const parser = new self.TreeSitter();
  parser.setLanguage(await grammars.get(name));
  parser.setTimeoutMicros(200000);
  return parser;
}

self.onmessage = async ({ data: { id, language, source } }) => {
  const markers = [];
  try {
    if (source.length > 100000) throw new Error('Syntax checking is limited to 100,000 characters.');
    if (language === 'csharp' || language === 'php') {
      const parser = await treeParser(language);
      let tree;
      try {
        // PHP snippets may omit the opening tag; offsets remain relative to the editor.
        const prefix = language === 'php' && !source.trimStart().startsWith('<?') ? '<?php\n' : '';
        tree = parser.parse(prefix + source);
        const pending = [tree.rootNode];
        while (pending.length && markers.length < 50) {
          const node = pending.pop();
          if (node.type === 'ERROR' || node.isMissing()) {
            const startLine = Math.max(1, node.startPosition.row + 1 - (prefix ? 1 : 0));
            markers.push({ startLineNumber: startLine, startColumn: node.startPosition.column + 1, endLineNumber: Math.max(startLine, node.endPosition.row + 1 - (prefix ? 1 : 0)), endColumn: node.endPosition.column + 1, message: node.isMissing() ? `Expected ${node.type}` : 'Invalid syntax', source: `${language} syntax` });
          } else if (node.hasError()) pending.push(...node.children);
        }
      } finally { tree?.delete(); parser.delete(); }
    } else if (language === 'html') {
      const validator = new HtmlValidate({ elements: ['html5'], rules: { 'close-order': 'error', 'no-dup-attr': 'error' } });
      const report = await validator.validateString(source);
      for (const result of report.results) for (const issue of result.messages) {
        markers.push({ startLineNumber: issue.line, startColumn: issue.column, endLineNumber: issue.line, endColumn: issue.column + Math.max(1, issue.size ?? 1), message: issue.message, source: 'HTML syntax' });
      }
    } else {
      try {
        if (language === 'graphql') parseGraphQL(source);
        if (language === 'sql') new SQLParser().astify(source);
      } catch (error) {
        const location = error.locations?.[0] ?? error.location?.start ?? { line: 1, column: 1 };
        markers.push({ startLineNumber: location.line, startColumn: location.column, endLineNumber: location.line, endColumn: location.column + 1, message: error.message, source: language === 'sql' ? 'MySQL syntax' : 'GraphQL syntax' });
      }
    }
    self.postMessage({ id, markers });
  } catch (error) {
    self.postMessage({ id, error: error.message || 'Parser unavailable' });
  }
};
