/**
 * converter.js
 * Handles JavaScript → UPL and UPL → JavaScript conversion
 * via the semantic UPL layer. Never converts directly.
 *
 * Architecture:
 *   JavaScript ↔ UPL Semantic Layer ↔ Human Language Pack
 */

import { generateAST, LANGUAGE_PACKS, isDecorativeComment } from "../parser/parser.js";

// ─── UPL Semantic IR Types ────────────────────────────────────────────────────
// Each UPL instruction is a plain object: { op, ...fields }
// These are the canonical "middle" representation.

function uplNode(op, fields = {}) {
  return { op, ...fields };
}

// ─── AST → UPL Semantic Layer ────────────────────────────────────────────────

function astNodeToUPL(node) {
  switch (node.type) {
    case "Comment":
      return uplNode("comment", { text: node.value });

    case "ImportDeclaration":
      return uplNode("import", { specifiers: node.specifiers, source: node.source });

    case "ExportDefaultDeclaration":
      return uplNode("export_default", { value: node.value });

    case "ExportNamedDeclaration":
      return uplNode("export_named", { declaration: node.declaration });

    case "VariableDeclaration":
      return uplNode("declare_variable", { kind: node.kind, name: node.name, value: node.value });

    case "FunctionDeclaration":
      return uplNode("declare_function", { name: node.name, params: node.params, async: false });

    case "AsyncFunctionDeclaration":
      return uplNode("declare_function", { name: node.name, params: node.params, async: true });

    case "ArrowFunctionDeclaration":
      return uplNode("declare_arrow_function", { name: node.name, params: node.params, async: node.async });

    case "ClassDeclaration":
      return uplNode("declare_class", { name: node.name, superClass: node.superClass });

    case "Constructor":
      return uplNode("constructor", { params: node.params });

    case "IfStatement":
      return uplNode("if", { condition: node.condition });

    case "ElseIfStatement":
      return uplNode("else_if", { condition: node.condition });

    case "ElseStatement":
      return uplNode("else", {});

    case "ForStatement":
      return uplNode("for_loop", { init: node.init });

    case "ForOfStatement":
      return uplNode("for_of", { variable: node.variable, iterable: node.iterable });

    case "ForInStatement":
      return uplNode("for_in", { variable: node.variable, object: node.object });

    case "WhileStatement":
      return uplNode("while_loop", { condition: node.condition });

    case "DoWhileStatement":
      return uplNode("do_while", {});

    case "SwitchStatement":
      return uplNode("switch", { discriminant: node.discriminant });

    case "CaseClause":
      return uplNode("case", { value: node.value });

    case "ReturnStatement":
      return uplNode("return", { value: node.value });

    case "BreakStatement":
      return uplNode("break", {});

    case "ContinueStatement":
      return uplNode("continue", {});

    case "ThrowStatement":
      return uplNode("throw", { argument: node.argument });

    case "TryStatement":
      return uplNode("try", {});

    case "CatchClause":
      return uplNode("catch", { param: node.param });

    case "FinallyClause":
      return uplNode("finally", {});

    case "ConsoleLog":
      return uplNode("console_log", { args: node.args });

    case "ArrayPush":
      return uplNode("array_push", { array: node.array, value: node.value });

    case "ArrayPop":
      return uplNode("array_pop", { array: node.array });

    case "AssignmentExpression":
      return uplNode("assign", { left: node.left, right: node.right });

    case "CallExpression":
      return uplNode("call", { callee: node.callee, args: node.args });

    case "BlockClose":
      return uplNode("block_close", { raw: node.raw });

    default:
      return uplNode("raw", { value: node.raw || "" });
  }
}

function codeToUPLSemantic(code) {
  const ast = generateAST(code, "javascript");
  return ast.body.map(astNodeToUPL);
}

// ─── UPL Semantic Layer → Human Language ────────────────────────────────────

function uplSemanticToHuman(uplNodes, langCode = "hindi") {
  const pack = LANGUAGE_PACKS[langCode] || LANGUAGE_PACKS.hindi;
  const T = pack.translations;
  const lines = [];

  for (const node of uplNodes) {
    switch (node.op) {
      case "comment":
        lines.push(`# ${node.text}`);
        break;

      case "import":
        lines.push(`${T.import} [ ${node.specifiers} ] से "${node.source}"`);
        break;

      case "export_default":
        lines.push(`${T.default_export} ${node.value}`);
        break;

      case "export_named":
        lines.push(`${T.export} ${node.declaration}`);
        break;

      case "declare_variable": {
        const kindWord = node.kind === "const" ? T.declare_const : node.kind === "let" ? T.declare_let : T.declare_variable;
        const valPart = node.value ? ` ${T.assign} ${node.value}` : "";
        lines.push(`${kindWord} ${node.name}${valPart}`);
        break;
      }

      case "declare_function":
        if (node.async) {
          lines.push(`${T.async_function} ${node.name} ( ${node.params} ) :`);
        } else {
          lines.push(`${T.declare_function} ${node.name} ( ${node.params} ) :`);
        }
        break;

      case "declare_arrow_function":
        lines.push(`${node.async ? T.async_function : T.declare_arrow_function} ${node.name} ( ${node.params} ) :`);
        break;

      case "declare_class":
        if (node.superClass) {
          lines.push(`${T.declare_class} ${node.name} ${T.extends} ${node.superClass} :`);
        } else {
          lines.push(`${T.declare_class} ${node.name} :`);
        }
        break;

      case "constructor":
        lines.push(`  ${T.constructor} ( ${node.params} ) :`);
        break;

      case "if":
        lines.push(`${T.if_statement} ( ${node.condition} ) :`);
        break;

      case "else_if":
        lines.push(`${T.else_if_statement} ( ${node.condition} ) :`);
        break;

      case "else":
        lines.push(`${T.else_statement} :`);
        break;

      case "for_loop":
        lines.push(`${T.for_loop} ( ${node.init} ) :`);
        break;

      case "for_of":
        lines.push(`${T.for_loop} ${node.variable} में से ${node.iterable} :`);
        break;

      case "for_in":
        lines.push(`${T.for_loop} ${node.variable} में ${node.object} :`);
        break;

      case "while_loop":
        lines.push(`${T.while_loop} ( ${node.condition} ) :`);
        break;

      case "do_while":
        lines.push(`${T.do_while_loop} :`);
        break;

      case "switch":
        lines.push(`${T.switch_statement} ( ${node.discriminant} ) :`);
        break;

      case "case":
        lines.push(`  ${T.case_statement} ${node.value} :`);
        break;

      case "return":
        lines.push(`  ${T.return_statement} ${node.value}`);
        break;

      case "break":
        lines.push(`  ${T.break_statement}`);
        break;

      case "continue":
        lines.push(`  ${T.continue_statement}`);
        break;

      case "throw":
        lines.push(`  ${T.throw} ${node.argument}`);
        break;

      case "try":
        lines.push(`${T.try} :`);
        break;

      case "catch":
        lines.push(`${T.catch} ( ${node.param} ) :`);
        break;

      case "finally":
        lines.push(`${T.finally} :`);
        break;

      case "console_log":
        lines.push(`  ${T.console_log} ( ${node.args} )`);
        break;

      case "array_push":
        lines.push(`  ${node.array} ${T.push} ${node.value}`);
        break;

      case "array_pop":
        lines.push(`  ${node.array} ${T.pop}`);
        break;

      case "assign":
        lines.push(`  ${node.left} ${T.assign} ${node.right}`);
        break;

      case "call":
        lines.push(`  ${T.call} ${node.callee} ( ${node.args} )`);
        break;

      case "block_close":
        lines.push(`---`);
        break;

      case "raw":
        lines.push(node.value ? `  >> ${node.value}` : "");
        break;

      default:
        lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── Human Language → UPL Semantic Layer ────────────────────────────────────

function humanToUPLSemantic(uplText, langCode = "hindi") {
  const pack = LANGUAGE_PACKS[langCode] || LANGUAGE_PACKS.hindi;
  const T = pack.translations;

  // Build reverse map: translation → key
  const reverseMap = {};
  for (const [key, val] of Object.entries(T)) {
    reverseMap[val] = key;
  }

  const lines = uplText.split("\n");
  const semantic = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Comment
    if (line.startsWith("#")) {
      semantic.push(uplNode("comment", { text: line.slice(1).trim() }));
      continue;
    }

    // Block close
    if (line === "---") {
      semantic.push(uplNode("block_close", { raw: "}" }));
      continue;
    }

    // Raw passthrough
    if (line.startsWith(">>")) {
      semantic.push(uplNode("raw", { value: line.slice(2).trim() }));
      continue;
    }

    // Import
    if (line.startsWith(T.import)) {
      const match = line.match(/\[\s*(.+?)\s*\]\s*से\s*"(.+)"/);
      if (match) {
        semantic.push(uplNode("import", { specifiers: match[1], source: match[2] }));
      } else {
        semantic.push(uplNode("raw", { value: `import ${line.slice(T.import.length).trim()}` }));
      }
      continue;
    }

    // Export default
    if (line.startsWith(T.default_export)) {
      const val = line.slice(T.default_export.length).trim();
      semantic.push(uplNode("export_default", { value: val }));
      continue;
    }

    // Export named
    if (line.startsWith(T.export + " ") && !line.startsWith(T.default_export)) {
      semantic.push(uplNode("export_named", { declaration: line.slice(T.export.length + 1).trim() }));
      continue;
    }

    // Variable declarations
    for (const [op, keyword] of [[T.declare_const, "const"], [T.declare_let, "let"], [T.declare_variable, "var"]]) {
      if (line.startsWith(op + " ")) {
        const rest = line.slice(op.length).trim();
        const eqIdx = rest.indexOf(T.assign);
        const name = eqIdx >= 0 ? rest.slice(0, eqIdx).trim() : rest;
        const value = eqIdx >= 0 ? rest.slice(eqIdx + T.assign.length).trim() : "";
        semantic.push(uplNode("declare_variable", { kind: keyword, name, value }));
        break;
      }
    }
    if (semantic.length && semantic[semantic.length - 1]?.op === "declare_variable") continue;

    // Async function
    if (line.startsWith(T.async_function + " ")) {
      const rest = line.slice(T.async_function.length).trim();
      const match = rest.match(/^(\w+)\s*\(\s*(.*?)\s*\)\s*:/);
      semantic.push(uplNode("declare_function", {
        name: match ? match[1] : rest,
        params: match ? match[2] : "",
        async: true,
      }));
      continue;
    }

    // Arrow function
    if (line.startsWith(T.declare_arrow_function + " ")) {
      const rest = line.slice(T.declare_arrow_function.length).trim();
      const match = rest.match(/^(\w+)\s*\(\s*(.*?)\s*\)\s*:/);
      semantic.push(uplNode("declare_arrow_function", {
        name: match ? match[1] : rest,
        params: match ? match[2] : "",
        async: false,
      }));
      continue;
    }

    // Function
    if (line.startsWith(T.declare_function + " ")) {
      const rest = line.slice(T.declare_function.length).trim();
      const match = rest.match(/^(\w+)\s*\(\s*(.*?)\s*\)\s*:/);
      semantic.push(uplNode("declare_function", {
        name: match ? match[1] : rest,
        params: match ? match[2] : "",
        async: false,
      }));
      continue;
    }

    // Class
    if (line.startsWith(T.declare_class + " ")) {
      const rest = line.slice(T.declare_class.length).trim();
      const extMatch = rest.match(/^(\w+)\s+\S+\s+(\w+)\s*:/);
      const simpleMatch = rest.match(/^(\w+)\s*:/);
      semantic.push(uplNode("declare_class", {
        name: extMatch ? extMatch[1] : simpleMatch ? simpleMatch[1] : rest,
        superClass: extMatch ? extMatch[2] : null,
      }));
      continue;
    }

    // Constructor
    if (line.includes(T.constructor)) {
      const match = line.match(/\(\s*(.*?)\s*\)\s*:/);
      semantic.push(uplNode("constructor", { params: match ? match[1] : "" }));
      continue;
    }

    // If / else if / else
    if (line.startsWith(T.else_if_statement)) {
      const match = line.match(/\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("else_if", { condition: match ? match[1] : "" }));
      continue;
    }
    if (line.startsWith(T.else_statement + " :") || line === T.else_statement + ":") {
      semantic.push(uplNode("else", {}));
      continue;
    }
    if (line.startsWith(T.if_statement + " (") || line.startsWith(T.if_statement + "(")) {
      const match = line.match(/\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("if", { condition: match ? match[1] : "" }));
      continue;
    }

    // For loop
    if (line.startsWith(T.for_loop)) {
      const ofMatch = line.match(/(\w+)\s+में\s+से\s+(\w+)/);
      const inMatch = line.match(/(\w+)\s+में\s+(\w+)/);
      const stdMatch = line.match(/\(\s*(.*?)\s*\)/);
      if (ofMatch) {
        semantic.push(uplNode("for_of", { variable: ofMatch[1], iterable: ofMatch[2] }));
      } else if (inMatch) {
        semantic.push(uplNode("for_in", { variable: inMatch[1], object: inMatch[2] }));
      } else {
        semantic.push(uplNode("for_loop", { init: stdMatch ? stdMatch[1] : "" }));
      }
      continue;
    }

    // While
    if (line.startsWith(T.while_loop)) {
      const match = line.match(/\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("while_loop", { condition: match ? match[1] : "" }));
      continue;
    }

    // Do while
    if (line.startsWith(T.do_while_loop)) {
      semantic.push(uplNode("do_while", {}));
      continue;
    }

    // Switch / case
    if (line.startsWith(T.switch_statement)) {
      const match = line.match(/\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("switch", { discriminant: match ? match[1] : "" }));
      continue;
    }
    if (line.trim().startsWith(T.case_statement + " ")) {
      const val = line.trim().slice(T.case_statement.length).replace(/:$/, "").trim();
      semantic.push(uplNode("case", { value: val }));
      continue;
    }

    // Return
    if (line.trim().startsWith(T.return_statement)) {
      const val = line.trim().slice(T.return_statement.length).trim();
      semantic.push(uplNode("return", { value: val }));
      continue;
    }

    // Break / continue
    if (line.trim() === T.break_statement) {
      semantic.push(uplNode("break", {}));
      continue;
    }
    if (line.trim() === T.continue_statement) {
      semantic.push(uplNode("continue", {}));
      continue;
    }

    // Throw
    if (line.trim().startsWith(T.throw + " ")) {
      semantic.push(uplNode("throw", { argument: line.trim().slice(T.throw.length).trim() }));
      continue;
    }

    // Try / catch / finally
    if (line.trim() === T.try + " :") {
      semantic.push(uplNode("try", {}));
      continue;
    }
    if (line.trim().startsWith(T.catch + " (")) {
      const match = line.match(/\(\s*(\w+)\s*\)/);
      semantic.push(uplNode("catch", { param: match ? match[1] : "e" }));
      continue;
    }
    if (line.trim() === T.finally + " :") {
      semantic.push(uplNode("finally", {}));
      continue;
    }

    // Console log
    if (line.trim().startsWith(T.console_log + " (") || line.trim().startsWith(T.console_log + "(")) {
      const match = line.match(/\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("console_log", { args: match ? match[1] : "" }));
      continue;
    }

    // Array push
    if (line.includes(T.push)) {
      const idx = line.indexOf(T.push);
      const array = line.slice(0, idx).trim();
      const value = line.slice(idx + T.push.length).trim();
      semantic.push(uplNode("array_push", { array, value }));
      continue;
    }

    // Array pop
    if (line.includes(T.pop)) {
      const array = line.slice(0, line.indexOf(T.pop)).trim();
      semantic.push(uplNode("array_pop", { array }));
      continue;
    }

    // Call
    if (line.trim().startsWith(T.call + " ")) {
      const rest = line.trim().slice(T.call.length).trim();
      const match = rest.match(/^([\w.]+)\s*\(\s*(.*?)\s*\)/);
      semantic.push(uplNode("call", {
        callee: match ? match[1] : rest,
        args: match ? match[2] : "",
      }));
      continue;
    }

    // Assignment
    if (line.includes(` ${T.assign} `)) {
      const eqIdx = line.indexOf(` ${T.assign} `);
      const left = line.slice(0, eqIdx).trim();
      const right = line.slice(eqIdx + T.assign.length + 2).trim();
      semantic.push(uplNode("assign", { left, right }));
      continue;
    }

    // Fallback
    semantic.push(uplNode("raw", { value: line }));
  }

  return semantic;
}

// ─── UPL Semantic Layer → JavaScript ─────────────────────────────────────────

function uplSemanticToJS(uplNodes) {
  const lines = [];
  const indentStack = [0];
  let indent = 0;

  const pad = () => "  ".repeat(indent);

  for (const node of uplNodes) {
    switch (node.op) {
      case "comment":
        lines.push(`${pad()}// ${node.text}`);
        break;

      case "import":
        if (node.specifiers && node.specifiers !== "*") {
          const isDefault = !node.specifiers.includes(",") && !node.specifiers.startsWith("{");
          const spec = isDefault ? node.specifiers : `{ ${node.specifiers} }`;
          lines.push(`import ${spec} from '${node.source}';`);
        } else {
          lines.push(`import '${node.source}';`);
        }
        break;

      case "export_default":
        lines.push(`export default ${node.value};`);
        break;

      case "export_named":
        lines.push(`export ${node.declaration};`);
        break;

      case "declare_variable": {
        const val = node.value ? ` = ${node.value}` : "";
        lines.push(`${pad()}${node.kind} ${node.name}${val};`);
        break;
      }

      case "declare_function":
        lines.push(`${pad()}${node.async ? "async " : ""}function ${node.name}(${node.params}) {`);
        indent++;
        break;

      case "declare_arrow_function":
        lines.push(`${pad()}${node.async ? "async " : ""}const ${node.name} = (${node.params}) => {`);
        indent++;
        break;

      case "declare_class":
        if (node.superClass) {
          lines.push(`${pad()}class ${node.name} extends ${node.superClass} {`);
        } else {
          lines.push(`${pad()}class ${node.name} {`);
        }
        indent++;
        break;

      case "constructor":
        lines.push(`${pad()}constructor(${node.params}) {`);
        indent++;
        break;

      case "if":
        lines.push(`${pad()}if (${node.condition}) {`);
        indent++;
        break;

      case "else_if":
        indent--;
        lines.push(`${pad()}} else if (${node.condition}) {`);
        indent++;
        break;

      case "else":
        indent--;
        lines.push(`${pad()}} else {`);
        indent++;
        break;

      case "for_loop":
        lines.push(`${pad()}for (${node.init}) {`);
        indent++;
        break;

      case "for_of":
        lines.push(`${pad()}for (const ${node.variable} of ${node.iterable}) {`);
        indent++;
        break;

      case "for_in":
        lines.push(`${pad()}for (const ${node.variable} in ${node.object}) {`);
        indent++;
        break;

      case "while_loop":
        lines.push(`${pad()}while (${node.condition}) {`);
        indent++;
        break;

      case "do_while":
        lines.push(`${pad()}do {`);
        indent++;
        break;

      case "switch":
        lines.push(`${pad()}switch (${node.discriminant}) {`);
        indent++;
        break;

      case "case":
        lines.push(`${pad()}case ${node.value}:`);
        break;

      case "return":
        lines.push(`${pad()}return ${node.value};`);
        break;

      case "break":
        lines.push(`${pad()}break;`);
        break;

      case "continue":
        lines.push(`${pad()}continue;`);
        break;

      case "throw":
        lines.push(`${pad()}throw ${node.argument};`);
        break;

      case "try":
        lines.push(`${pad()}try {`);
        indent++;
        break;

      case "catch":
        indent--;
        lines.push(`${pad()}} catch (${node.param}) {`);
        indent++;
        break;

      case "finally":
        indent--;
        lines.push(`${pad()}} finally {`);
        indent++;
        break;

      case "console_log":
        lines.push(`${pad()}console.log(${node.args});`);
        break;

      case "array_push":
        lines.push(`${pad()}${node.array}.push(${node.value});`);
        break;

      case "array_pop":
        lines.push(`${pad()}${node.array}.pop();`);
        break;

      case "assign":
        lines.push(`${pad()}${node.left} = ${node.right};`);
        break;

      case "call":
        lines.push(`${pad()}${node.callee}(${node.args});`);
        break;

      case "block_close":
        if (indent > 0) indent--;
        lines.push(`${pad()}}`);
        break;

      case "raw":
        lines.push(node.value ? `${pad()}${node.value}` : "");
        break;

      default:
        break;
    }
  }

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert JavaScript source code → UPL human-readable text
 * @param {string} code - JS source
 * @param {string} langCode - language pack key ('hindi' | 'english')
 * @returns {string} UPL text
 */
export function codeToUPL(code, langCode = "hindi") {
  const semantic = codeToUPLSemantic(code);
  return uplSemanticToHuman(semantic, langCode);
}

/**
 * Convert UPL human-readable text → JavaScript source code
 * @param {string} uplText - UPL text
 * @param {string} langCode - language pack key
 * @returns {string} JS source
 */
export function uplToCode(uplText, langCode = "hindi") {
  const semantic = humanToUPLSemantic(uplText, langCode);
  return uplSemanticToJS(semantic);
}
