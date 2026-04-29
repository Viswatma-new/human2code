import React, { useState, useRef, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { generateAST, detectLanguage, LANGUAGE_PACKS } from "../parser/parser.js";
import { codeToUPL, uplToCode } from "../converter/converter.js";

// ─── Monaco Options ───────────────────────────────────────────────────────────
const MONACO_OPTIONS = {
  fontSize: 13,
  fontFamily: "'Space Mono', monospace",
  lineHeight: 20,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  renderLineHighlight: "all",
  lineNumbers: "on",
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 8,
  lineNumbersMinChars: 3,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    alwaysConsumeMouseWheel: false,
  },
  padding: { top: 16, bottom: 16 },
  wordWrap: "on",
  theme: "htc-dark",
};

// ─── AST Node Color Map ───────────────────────────────────────────────────────
function nodeColor(type) {
  if (["FunctionDeclaration", "AsyncFunctionDeclaration", "ArrowFunctionDeclaration"].includes(type)) return "purple";
  if (["ClassDeclaration", "Constructor"].includes(type)) return "amber";
  if (["IfStatement", "ElseStatement", "ElseIfStatement", "SwitchStatement", "CaseClause"].includes(type)) return "amber";
  if (["ForStatement", "ForOfStatement", "ForInStatement", "WhileStatement", "DoWhileStatement"].includes(type)) return "amber";
  if (["ImportDeclaration", "ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(type)) return "purple";
  if (["ReturnStatement", "ThrowStatement"].includes(type)) return "green";
  if (["VariableDeclaration"].includes(type)) return "";
  if (["Comment"].includes(type)) return "gray";
  return "";
}

function nodeLabel(node) {
  switch (node.type) {
    case "FunctionDeclaration":
    case "AsyncFunctionDeclaration":
      return `fn ${node.name}(${node.params})`;
    case "ArrowFunctionDeclaration":
      return `${node.name} = (${node.params}) =>`;
    case "ClassDeclaration":
      return `class ${node.name}${node.superClass ? ` extends ${node.superClass}` : ""}`;
    case "Constructor":
      return `constructor(${node.params})`;
    case "VariableDeclaration":
      return `${node.kind} ${node.name}${node.value ? ` = ${node.value.slice(0, 20)}` : ""}`;
    case "IfStatement":
      return `if (${node.condition})`;
    case "ElseIfStatement":
      return `else if (${node.condition})`;
    case "ElseStatement":
      return "else";
    case "ForStatement":
    case "ForOfStatement":
    case "ForInStatement":
      return node.variable ? `for (${node.variable}...)` : `for (${(node.init || "").slice(0, 24)})`;
    case "WhileStatement":
      return `while (${node.condition})`;
    case "SwitchStatement":
      return `switch (${node.discriminant})`;
    case "CaseClause":
      return `case ${node.value}`;
    case "ReturnStatement":
      return `return ${(node.value || "").slice(0, 24)}`;
    case "ImportDeclaration":
      return `import '${node.source}'`;
    case "ExportDefaultDeclaration":
      return `export default`;
    case "ConsoleLog":
      return `console.log(${(node.args || "").slice(0, 20)})`;
    case "ArrayPush":
      return `${node.array}.push(${node.value})`;
    case "CallExpression":
      return `${node.callee}(${(node.args || "").slice(0, 16)})`;
    case "AssignmentExpression":
      return `${node.left} = ${(node.right || "").slice(0, 20)}`;
    case "Comment":
      return `// ${node.value.slice(0, 28)}`;
    case "BlockClose":
      return "}";
    default:
      return node.raw ? node.raw.slice(0, 32) : node.type;
  }
}

// ─── AST Node Component ───────────────────────────────────────────────────────
function ASTNode({ node, index, total }) {
  const isLast = index === total - 1;
  const connector = isLast ? "└─" : "├─";
  const color = nodeColor(node.type);

  return (
    <div className="ast-node">
      <span className="ast-node-connector">{connector}</span>
      <span className={`ast-node-type ${color}`}>{node.type}</span>
      <span className="ast-node-meta">{nodeLabel(node)}</span>
      {node.line && <span className="ast-line-num">:{node.line}</span>}
    </div>
  );
}

// ─── IDE Component ────────────────────────────────────────────────────────────
export default function IDE({ onBack }) {
  const [uplText, setUplText] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [ast, setAst] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [detectedLang, setDetectedLang] = useState("javascript");
  const [activeLang, setActiveLang] = useState("hindi");
  const [activeTab, setActiveTab] = useState("ast");
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced
  const [monacoReady, setMonacoReady] = useState(false);
  const [editSource, setEditSource] = useState(null); // 'upl' | 'js'

  const fileInputRef = useRef(null);
  const syncTimerRef = useRef(null);
  const uplEditorRef = useRef(null);
  const jsEditorRef = useRef(null);
  const monacoRef = useRef(null);

  // ─── Register Monaco Theme ─────────────────────────────────────────────────
  const handleMonacoMount = useCallback((editor, monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("htc-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "3d5068", fontStyle: "italic" },
        { token: "keyword", foreground: "00d4ff" },
        { token: "string", foreground: "00ff88" },
        { token: "number", foreground: "ffb800" },
        { token: "identifier", foreground: "e8f0fe" },
        { token: "delimiter", foreground: "7a8aa0" },
        { token: "operator", foreground: "7b2fff" },
      ],
      colors: {
        "editor.background": "#060c14",
        "editor.foreground": "#e8f0fe",
        "editor.lineHighlightBackground": "#0a1220",
        "editor.selectionBackground": "#00d4ff22",
        "editorLineNumber.foreground": "#3d5068",
        "editorLineNumber.activeForeground": "#00d4ff",
        "editorCursor.foreground": "#00d4ff",
        "editor.inactiveSelectionBackground": "#00d4ff11",
        "editorBracketMatch.background": "#00d4ff11",
        "editorBracketMatch.border": "#00d4ff44",
      },
    });
    monaco.editor.setTheme("htc-dark");
    setMonacoReady(true);
  }, []);

  const handleUPLMount = useCallback((editor) => {
    uplEditorRef.current = editor;
  }, []);

  const handleJSMount = useCallback((editor) => {
    jsEditorRef.current = editor;
  }, []);

  // ─── File Upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const code = e.target.result;
      const lang = detectLanguage(file.name);
      const astResult = generateAST(code, lang);
      const upl = codeToUPL(code, activeLang);

      setFileName(file.name);
      setDetectedLang(lang);
      setJsCode(code);
      setAst(astResult);
      setUplText(upl);
      setEditSource(null);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    };
    reader.readAsText(file);
  };

  const onFileChange = (e) => {
    handleFileUpload(e.target.files[0]);
    e.target.value = "";
  };

  // Drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files[0]);
  };

  // ─── UPL Edit → JS Sync ────────────────────────────────────────────────────
  const handleUPLChange = useCallback(
    (value) => {
      setUplText(value || "");
      if (editSource === "js") return; // don't sync back if js is editing

      clearTimeout(syncTimerRef.current);
      setSyncStatus("syncing");
      syncTimerRef.current = setTimeout(() => {
        const newJS = uplToCode(value || "", activeLang);
        const newAst = generateAST(newJS, detectedLang);
        setJsCode(newJS);
        setAst(newAst);
        setSyncStatus("synced");
        setEditSource("upl");
        setTimeout(() => setSyncStatus("idle"), 1500);
      }, 600);
    },
    [activeLang, detectedLang, editSource]
  );

  // ─── JS Edit → UPL Sync ────────────────────────────────────────────────────
  const handleJSChange = useCallback(
    (value) => {
      setJsCode(value || "");
      if (editSource === "upl") return;

      clearTimeout(syncTimerRef.current);
      setSyncStatus("syncing");
      syncTimerRef.current = setTimeout(() => {
        const newUPL = codeToUPL(value || "", activeLang);
        const newAst = generateAST(value || "", detectedLang);
        setUplText(newUPL);
        setAst(newAst);
        setSyncStatus("synced");
        setEditSource("js");
        setTimeout(() => setSyncStatus("idle"), 1500);
      }, 600);
    },
    [activeLang, detectedLang, editSource]
  );

  // ─── Language Switch ───────────────────────────────────────────────────────
  const cycleLang = () => {
    const langs = Object.keys(LANGUAGE_PACKS);
    const idx = langs.indexOf(activeLang);
    const next = langs[(idx + 1) % langs.length];
    setActiveLang(next);

    if (jsCode) {
      const newUPL = codeToUPL(jsCode, next);
      setUplText(newUPL);
    }
  };

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearTimeout(syncTimerRef.current);
  }, []);

  const currentLangPack = LANGUAGE_PACKS[activeLang];
  const hasFile = !!fileName;

  return (
    <div className="ide-root">
      {/* Topbar */}
      <header className="ide-topbar">
        <button className="back-btn" onClick={onBack}>
          ← Home
        </button>
        <div className="topbar-divider" />

        <span className="topbar-logo">H→C</span>

        {hasFile && (
          <div className="topbar-file-info">
            <span className="file-name">{fileName}</span>
            <span className="file-lang">{detectedLang}</span>
          </div>
        )}

        <div className="topbar-actions">
          {/* Sync status */}
          {syncStatus !== "idle" && (
            <span className={`sync-badge ${syncStatus}`}>
              {syncStatus === "syncing" ? "● syncing" : "✓ synced"}
            </span>
          )}

          {/* Language toggle */}
          <button className="lang-selector" onClick={cycleLang} title="Switch language">
            <span className="lang-dot" />
            {currentLangPack.name}
          </button>

          {/* Upload */}
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
            ↑ Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.jsx,.ts,.tsx"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>
      </header>

      {/* Body */}
      <div className="ide-body">
        {/* Left: UPL Editor */}
        <div className="ide-panel" style={{ flex: "1 1 55%" }}>
          <div className="ide-panel-header">
            <span className="panel-indicator" />
            <span className="panel-title">UPL Editor</span>
            <span className="panel-tag">{currentLangPack.name}</span>
          </div>

          <div className="panel-content">
            {!hasFile ? (
              <div
                className="empty-state"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="empty-icon">⌬</div>
                <div className="empty-title">No file loaded</div>
                <div className="empty-hint">
                  Upload a .js or .jsx file to begin.<br />
                  Your code will appear here in {currentLangPack.name}.
                </div>
                <button className="empty-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  ↑ Upload File
                </button>
              </div>
            ) : (
              <div className="monaco-wrapper">
                <Editor
                  height="100%"
                  defaultLanguage="plaintext"
                  value={uplText}
                  onChange={handleUPLChange}
                  options={{
                    ...MONACO_OPTIONS,
                    fontFamily: "'Noto Sans Devanagari', 'Space Mono', monospace",
                  }}
                  theme="htc-dark"
                  onMount={(editor) => {
                    handleUPLMount(editor);
                    handleMonacoMount(editor, window.monaco || editor._domElement?.__monaco);
                  }}
                  beforeMount={(monaco) => {
                    if (!monacoReady) {
                      monaco.editor.defineTheme("htc-dark", {
                        base: "vs-dark",
                        inherit: true,
                        rules: [
                          { token: "comment", foreground: "3d5068", fontStyle: "italic" },
                          { token: "keyword", foreground: "00d4ff" },
                        ],
                        colors: {
                          "editor.background": "#060c14",
                          "editor.foreground": "#e8f0fe",
                          "editor.lineHighlightBackground": "#0a1220",
                          "editor.selectionBackground": "#00d4ff22",
                          "editorLineNumber.foreground": "#3d5068",
                          "editorLineNumber.activeForeground": "#00d4ff",
                          "editorCursor.foreground": "#00d4ff",
                          "editorBracketMatch.background": "#00d4ff11",
                          "editorBracketMatch.border": "#00d4ff44",
                        },
                      });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div className="panel-resizer" />

        {/* Right: AST + JS */}
        <div className="ide-right-panel">
          <div className="right-tabs">
            <button
              className={`right-tab ${activeTab === "ast" ? "active" : ""}`}
              onClick={() => setActiveTab("ast")}
            >
              <span>⬡</span> AST Tree
            </button>
            <button
              className={`right-tab ${activeTab === "code" ? "active" : ""}`}
              onClick={() => setActiveTab("code")}
            >
              <span>{ }</span> Source Code
            </button>
          </div>

          <div className="right-panel-content">
            {activeTab === "ast" ? (
              <div className="panel-content">
                {!ast ? (
                  <div className="empty-state">
                    <div className="empty-icon">⬡</div>
                    <div className="empty-title">AST not generated</div>
                    <div className="empty-hint">Upload a file to see the abstract syntax tree.</div>
                  </div>
                ) : (
                  <div className="ast-tree">
                    <div className="ast-program" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>Program</span>
                      <span style={{ color: "var(--text-muted)", marginLeft: 12 }}>
                        {ast.body.length} nodes · {ast.language}
                      </span>
                    </div>
                    {ast.body.map((node, i) => (
                      <ASTNode key={i} node={node} index={i} total={ast.body.length} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-content">
                {!hasFile ? (
                  <div className="empty-state">
                    <div className="empty-icon">{ }</div>
                    <div className="empty-title">No source code</div>
                    <div className="empty-hint">Upload a file to see the original code.</div>
                  </div>
                ) : (
                  <div className="monaco-wrapper">
                    <Editor
                      height="100%"
                      language={detectedLang === "typescript" ? "typescript" : "javascript"}
                      value={jsCode}
                      onChange={handleJSChange}
                      options={MONACO_OPTIONS}
                      theme="htc-dark"
                      onMount={handleJSMount}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="ide-statusbar">
        <span className="statusbar-item active">
          <span className="statusbar-dot" />
          Human to Code
        </span>
        <span className="statusbar-item">
          UPL · {currentLangPack.name}
        </span>
        {hasFile && (
          <>
            <span className="statusbar-item green">
              <span className="statusbar-dot" />
              {fileName}
            </span>
            <span className="statusbar-item">
              {ast ? ast.body.length : 0} AST nodes
            </span>
          </>
        )}
        <span className="statusbar-spacer" />
        <span className="statusbar-item">
          JS ↔ UPL ↔ {currentLangPack.name}
        </span>
        <span className="statusbar-item">
          {syncStatus === "syncing" ? "⟳ syncing" : syncStatus === "synced" ? "✓ synced" : "● ready"}
        </span>
      </footer>
    </div>
  );
}
