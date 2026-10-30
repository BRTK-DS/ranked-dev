import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const words: Record<string, string[]> = {
  csharp: ['using', 'namespace', 'public', 'private', 'static', 'class', 'interface', 'string', 'int', 'bool', 'var', 'return', 'foreach', 'new', 'throw', 'async', 'await'],
  php: ['function', 'class', 'public', 'private', 'protected', 'return', 'foreach', 'namespace', 'use', 'echo', 'isset', 'empty', 'array_map', 'array_filter', 'count', 'strlen'],
  sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'COUNT', 'SUM', 'AVG'],
  graphql: ['query', 'mutation', 'subscription', 'fragment', 'on', 'type', 'input', 'interface', 'enum', 'String', 'Int', 'Boolean', 'ID'],
  xml: ['xsl:stylesheet', 'xsl:template', 'xsl:value-of', 'xsl:for-each', 'xsl:sort', 'xsl:if', 'xsl:choose', 'xsl:apply-templates', 'xmlns'],
  xpath: ['text()', 'node()', 'position()', 'last()', 'count()', 'contains()', 'starts-with()', 'normalize-space()', 'string()', 'not()', 'ancestor::', 'descendant::', 'following-sibling::', 'parent::', 'and', 'or'],
};
const snippets: Record<string, { label: string; code: string }[]> = {
  csharp: [{ label: 'foreach loop', code: 'foreach (var ${1:item} in ${2:items}) {\n\t$0\n}' }, { label: 'static method', code: 'public static ${1:int} ${2:Solve}(${3:int n}) {\n\t$0\n}' }],
  php: [{ label: 'function definition', code: 'function ${1:solve}(${2:$input}) {\n\t$0\n}' }, { label: 'foreach loop', code: 'foreach (${1:$items} as ${2:$item}) {\n\t$0\n}' }],
  sql: [{ label: 'SELECT query', code: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition};' }],
  graphql: [{ label: 'query definition', code: 'query ${1:Name} {\n\t${2:field}\n}' }],
  xml: [{ label: 'XSLT template', code: '<xsl:template match="${1:/}">\n\t$0\n</xsl:template>' }],
  xpath: [{ label: 'select by attribute', code: '//${1:element}[@${2:attribute}="${3:value}"]' }],
};

export function registerXPath(monaco: Monaco) {
  if (monaco.languages.getLanguages().some(item => item.id === 'xpath')) return;
  monaco.languages.register({ id: 'xpath', extensions: ['.xpath'] });
  monaco.languages.setMonarchTokensProvider('xpath', {
    tokenizer: { root: [
      [/"[^"]*"|'[^']*'/, 'string'],
      [/\b(?:and|or|mod|div)\b/, 'keyword'],
      [/[\w-]+(?=\s*\()/, 'type.identifier'],
      [/\d+(?:\.\d+)?/, 'number'],
      [/[@/\[\]().,:*=<>+|-]/, 'delimiter'],
      [/[\w-]+/, 'identifier'],
    ] },
  });
}

export function attachLanguageServices(monaco: Monaco, instance: editor.IStandaloneCodeEditor, label: string, setStatus: (text: string) => void) {
  const model = instance.getModel();
  if (!model) return () => {};
  const language = model.getLanguageId();
  const owner = 'ranked-syntax';
  const disposables: Array<{ dispose(): void }> = [];
  let disposed = false;
  let timer: ReturnType<typeof setTimeout>;
  let watchdog: ReturnType<typeof setTimeout>;
  let revision = 0;
  let worker: Worker | undefined;
  const setMarkers = (markers: editor.IMarkerData[]) => {
    if (!disposed && !model.isDisposed()) monaco.editor.setModelMarkers(model, owner, markers);
  };
  const syntaxStatus = language === 'sql' ? 'Syntax: MySQL' : language === 'xpath' ? 'Syntax: XPath 1.0' : language === 'xml' ? 'Syntax: XML (no schema validation)' : `Syntax: ${label}`;

  if (words[language]) disposables.push(monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems(candidate, position) {
      if (candidate !== model) return { suggestions: [] };
      const word = candidate.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      return { suggestions: [
        ...words[language].map(text => ({ label: text, insertText: text, kind: monaco.languages.CompletionItemKind.Keyword, detail: `${label} keyword / built-in`, range })),
        ...(snippets[language] ?? []).map(snippet => ({ label: snippet.label, insertText: snippet.code, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Snippet, detail: `${label} snippet`, range })),
      ] };
    },
  }));

  if (['csharp', 'php', 'sql', 'graphql', 'html'].includes(language)) {
    try {
      worker = new Worker('/ranked-dev/language-tools/worker.js');
      worker.onmessage = ({ data }) => {
        if (disposed || data.id !== revision) return;
        clearTimeout(watchdog);
        if (data.error) { setMarkers([]); setStatus(`Syntax unavailable: ${data.error}`); return; }
        setMarkers(data.markers.map((marker: editor.IMarkerData) => ({ ...marker, severity: monaco.MarkerSeverity.Error })));
        setStatus(syntaxStatus);
      };
      worker.onerror = () => { if (!disposed) { clearTimeout(watchdog); setMarkers([]); setStatus('Syntax unavailable — parser failed to load'); } };
    } catch { setStatus('Syntax unavailable — workers blocked'); }
  }

  function validate() {
    if (disposed || model!.isDisposed()) return;
    const source = model!.getValue();
    if (!source.trim()) { clearTimeout(watchdog); setMarkers([]); setStatus(syntaxStatus); return; }
    if (worker) {
      setStatus('Checking syntax…');
      clearTimeout(watchdog);
      watchdog = setTimeout(() => { worker?.terminate(); worker = undefined; setMarkers([]); setStatus('Syntax unavailable — parser timed out'); }, 15000);
      worker.postMessage({ id: revision, language, source });
      return;
    }
    if (language !== 'xml' && language !== 'xpath') return;
    if (source.length > 100000) { setMarkers([]); setStatus('Syntax checking limited to 100,000 characters'); return; }
    let message: string | undefined;
    if (language === 'xml') {
      const parsed = new DOMParser().parseFromString(source, 'application/xml');
      message = parsed.getElementsByTagName('parsererror')[0]?.textContent ?? undefined;
    } else {
      try { document.createExpression(source, prefix => `urn:ranked-xpath:${prefix}`); }
      catch (error) { message = error instanceof Error ? error.message : 'Invalid XPath 1.0 expression'; }
    }
    setMarkers(message ? [{ severity: monaco.MarkerSeverity.Error, source: syntaxStatus, message, startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: Math.max(2, model!.getLineMaxColumn(1)) }] : []);
    setStatus(syntaxStatus);
  }
  if (['javascript', 'typescript', 'json'].includes(language)) setStatus(`Diagnostics: ${label}`);
  else if (language === 'plaintext') setStatus('Plain text — no language diagnostics');
  else {
    disposables.push(model.onDidChangeContent(() => { revision++; clearTimeout(timer); setMarkers([]); timer = setTimeout(validate, 350); }));
    validate();
  }
  return () => {
    disposed = true;
    clearTimeout(timer);
    clearTimeout(watchdog);
    worker?.terminate();
    for (const disposable of disposables) disposable.dispose();
    if (!model.isDisposed()) monaco.editor.setModelMarkers(model, owner, []);
  };
}
