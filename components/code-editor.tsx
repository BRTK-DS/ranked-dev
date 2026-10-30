"use client";

import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import { Braces, Check, GitBranch, Keyboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { attachLanguageServices, registerXPath } from "@/lib/editor-language-services";

loader.config({ paths: { vs: '/ranked-dev/language-tools/vs' } });

export function CodeEditor({ value, onChange, onRun, language, languageLabel, modelPath }: { value: string; onChange: (value: string) => void; onRun: () => void; language: string; languageLabel: string; modelPath: string }) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState('Loading language tools…');
  useEffect(() => () => cleanup.current?.(), []);
  const beforeMount: BeforeMount = (monaco) => {
    registerXPath(monaco);
    monaco.editor.defineTheme("ranked-dev", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "C084FC", fontStyle: "bold" },
        { token: "identifier", foreground: "E4E4E7" },
        { token: "string", foreground: "6EE7B7" },
        { token: "number", foreground: "FBBF24" },
        { token: "comment", foreground: "71717A", fontStyle: "italic" },
        { token: "delimiter", foreground: "A1A1AA" },
        { token: "type.identifier", foreground: "67E8F9" }
      ],
      colors: {
        "editor.background": "#09090B",
        "editor.foreground": "#E4E4E7",
        "editorLineNumber.foreground": "#3F3F46",
        "editorLineNumber.activeForeground": "#34D399",
        "editorCursor.foreground": "#34D399",
        "editor.selectionBackground": "#10B98135",
        "editor.inactiveSelectionBackground": "#10B98120",
        "editor.lineHighlightBackground": "#18181B80",
        "editorIndentGuide.background1": "#27272A",
        "editorIndentGuide.activeBackground1": "#52525B",
        "editorBracketHighlight.foreground1": "#34D399",
        "editorBracketHighlight.foreground2": "#C084FC",
        "editorBracketHighlight.foreground3": "#FBBF24",
        "editorGutter.background": "#09090B",
        "editorSuggestWidget.background": "#18181B",
        "editorSuggestWidget.border": "#3F3F46",
        "editorWidget.border": "#3F3F46",
        "editorHoverWidget.background": "#18181B"
      }
    });
  };

  const onMount: OnMount = (editor, monaco) => {
    const model = editor.getModel();
    if (model && model.getLanguageId() !== language) monaco.editor.setModelLanguage(model, language);
    cleanup.current?.();
    cleanup.current = attachLanguageServices(monaco, editor, languageLabel, setDiagnosticsStatus);
    editor.addAction({
      id: "ranked-dev.run",
      label: "Run public tests",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => runRef.current()
    });
    editor.focus();
  };

  return (
    <div className="relative overflow-visible bg-[#09090b]">
      <Editor
        key={modelPath}
        path={modelPath}
        keepCurrentModel={false}
        saveViewState={false}
        height="430px"
        language={language}
        theme="ranked-dev"
        beforeMount={beforeMount}
        onMount={onMount}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        loading={<div className="grid h-[430px] place-items-center font-mono text-xs text-emerald-400">BOOTING EDITOR...</div>}
        options={{
          automaticLayout: true,
          fixedOverflowWidgets: true,
          minimap: { enabled: true, renderCharacters: false, scale: 0.8 },
          fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace",
          fontSize: 14,
          lineHeight: 24,
          fontLigatures: true,
          padding: { top: 18, bottom: 18 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          formatOnPaste: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          renderLineHighlight: "all"
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-2 font-mono text-[10px] text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400"><Check className="size-3" /> READY</span>
          <span className="flex items-center gap-1.5"><GitBranch className="size-3" /> main</span>
          <span className="flex items-center gap-1.5"><Braces className="size-3" /> {languageLabel}</span>
          <span role="status">{diagnosticsStatus}</span>
        </div>
        <span className="flex items-center gap-1.5"><Keyboard className="size-3" /> Ctrl+Enter to run</span>
      </div>
    </div>
  );
}
