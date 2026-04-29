/**
 * parser.js
 * Handles file extension detection, AST generation,
 * semantic parsing, language packs, and comment filtering.
 */

// ─── Language Packs ───────────────────────────────────────────────────────────

export const LANGUAGE_PACKS = {
  hindi: {
    name: "हिंदी",
    code: "hi",
    translations: {
      // Declarations
      declare_variable: "चर बनाओ",
      declare_const: "स्थिर बनाओ",
      declare_let: "बदलने_योग्य बनाओ",
      declare_function: "कार्य बनाओ",
      declare_class: "वर्ग बनाओ",
      declare_arrow_function: "तीर_कार्य बनाओ",

      // Control Flow
      if_statement: "अगर",
      else_statement: "वरना",
      else_if_statement: "वरना_अगर",
      for_loop: "के_लिए",
      while_loop: "जब_तक",
      do_while_loop: "करो_जब_तक",
      switch_statement: "चुनो",
      case_statement: "मामला",
      break_statement: "रोको",
      continue_statement: "जारी_रखो",
      return_statement: "वापस_करो",

      // Operations
      assign: "=",
      add: "जोड़ो",
      subtract: "घटाओ",
      multiply: "गुणा_करो",
      divide: "भाग_करो",
      modulo: "शेष",
      equals: "बराबर",
      not_equals: "बराबर_नहीं",
      greater_than: "बड़ा_है",
      less_than: "छोटा_है",
      and: "और",
      or: "या",
      not: "नहीं",

      // Array / Object
      push: "जोड़ो_अंत_में",
      pop: "हटाओ_अंत_से",
      length: "लंबाई",
      new_array: "नई_सूची",
      new_object: "नई_वस्तु",
      access: "लो",
      set: "रखो",

      // Functions
      call: "बुलाओ",
      parameters: "मापदंड",
      arguments: "तर्क",
      async_function: "असमकालिक_कार्य",
      await: "इंतज़ार_करो",
      promise: "वादा",

      // DOM
      console_log: "दिखाओ",
      alert: "चेतावनी",
      query_selector: "खोजो",
      add_event_listener: "सुनो",
      remove_event_listener: "बंद_करो_सुनना",

      // Import / Export
      import: "आयात",
      export: "निर्यात",
      default_export: "मुख्य_निर्यात",

      // Try/Catch
      try: "कोशिश",
      catch: "पकड़ो",
      finally: "अंत_में",
      throw: "फेंको",

      // Class
      constructor: "निर्माता",
      extends: "विस्तार_से",
      super: "मूल",
      this: "यह",
      new: "नया",
    },
  },
  english: {
    name: "English (UPL)",
    code: "en",
    translations: {
      declare_variable: "make variable",
      declare_const: "make constant",
      declare_let: "make mutable",
      declare_function: "define function",
      declare_class: "define class",
      declare_arrow_function: "define arrow",
      if_statement: "if",
      else_statement: "otherwise",
      else_if_statement: "otherwise if",
      for_loop: "loop for",
      while_loop: "loop while",
      do_while_loop: "do loop while",
      switch_statement: "choose",
      case_statement: "case",
      break_statement: "stop",
      continue_statement: "continue",
      return_statement: "return",
      assign: "=",
      add: "add",
      subtract: "subtract",
      multiply: "multiply",
      divide: "divide",
      modulo: "remainder",
      equals: "equals",
      not_equals: "not equals",
      greater_than: "greater than",
      less_than: "less than",
      and: "and",
      or: "or",
      not: "not",
      push: "add to end",
      pop: "remove from end",
      length: "length of",
      new_array: "new list",
      new_object: "new object",
      access: "get",
      set: "set",
      call: "call",
      parameters: "params",
      arguments: "args",
      async_function: "async function",
      await: "wait for",
      promise: "promise",
      console_log: "show",
      alert: "alert",
      query_selector: "find element",
      add_event_listener: "listen to",
      remove_event_listener: "stop listening",
      import: "import",
      export: "export",
      default_export: "export default",
      try: "try",
      catch: "catch",
      finally: "finally",
      throw: "throw",
      constructor: "constructor",
      extends: "extends",
      super: "super",
      this: "self",
      new: "create",
    },
  },
};

// ─── Decorative Comment Detector ─────────────────────────────────────────────

const DECORATIVE_COMMENT_PATTERNS = [
  /^\/\/\s*[=\-*#~^]+\s*$/,
  /^\/\/\s*[=\-*#~^]+\s*.+\s*[=\-*#~^]+\s*$/,
  /^\/\*+\s*$/,
  /^\s*\*+\s*$/,
  /^\s*\*+\/\s*$/,
  /^\/\/\s*[-=*]+$/,
  /^\/\/\s*SECTION\s*[-=*]+/i,
  /^\/\/\s*[-=*]+\s*SECTION/i,
];

export function isDecorativeComment(line) {
  const trimmed = line.trim();
  return DECORATIVE_COMMENT_PATTERNS.some((p) => p.test(trimmed));
}

// ─── File Extension Detection ─────────────────────────────────────────────────

export function detectLanguage(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const langMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
  };
  return langMap[ext] || "javascript";
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(code) {
  const lines = code.split("\n");
  const tokens = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (isDecorativeComment(trimmed)) continue;

    // Real single-line comment
    if (trimmed.startsWith("//") && !isDecorativeComment(trimmed)) {
      tokens.push({ type: "COMMENT", value: trimmed.slice(2).trim(), line: i + 1 });
      continue;
    }

    tokens.push({ type: "CODE", value: trimmed, raw: line, line: i + 1 });
  }

  return tokens;
}

// ─── AST Node Builder ─────────────────────────────────────────────────────────

function buildASTNode(type, props = {}) {
  return { type, ...props };
}

// ─── JS/JSX Semantic Parser ───────────────────────────────────────────────────

function parseJSLine(line) {
  const t = line.trim();

  // Import
  if (/^import\s/.test(t)) {
    const match = t.match(/^import\s+(.+?)\s+from\s+['"](.+)['"]/);
    if (match) {
      return buildASTNode("ImportDeclaration", {
        specifiers: match[1].replace(/[{}]/g, "").trim(),
        source: match[2],
        raw: t,
      });
    }
    return buildASTNode("ImportDeclaration", { specifiers: "*", source: t, raw: t });
  }

  // Export default
  if (/^export\s+default\s/.test(t)) {
    const value = t.replace(/^export\s+default\s+/, "");
    return buildASTNode("ExportDefaultDeclaration", { value, raw: t });
  }

  // Export named
  if (/^export\s+(const|let|var|function|class)\s/.test(t)) {
    return buildASTNode("ExportNamedDeclaration", { declaration: t.replace(/^export\s+/, ""), raw: t });
  }

  // const/let/var with arrow function
  if (/^(const|let|var)\s+\w+\s*=\s*(\(.*\)|[\w]+)\s*=>\s*\{?/.test(t)) {
    const nameMatch = t.match(/^(?:const|let|var)\s+(\w+)\s*=/);
    const paramsMatch = t.match(/=\s*\(?([\w\s,]*)\)?\s*=>/);
    return buildASTNode("ArrowFunctionDeclaration", {
      name: nameMatch ? nameMatch[1] : "anonymous",
      params: paramsMatch ? paramsMatch[1].trim() : "",
      async: /^async\s/.test(t) || t.includes("async "),
      raw: t,
    });
  }

  // async function
  if (/^async\s+function\s+\w+/.test(t)) {
    const match = t.match(/async\s+function\s+(\w+)\s*\((.*?)\)/);
    return buildASTNode("AsyncFunctionDeclaration", {
      name: match ? match[1] : "",
      params: match ? match[2] : "",
      raw: t,
    });
  }

  // function declaration
  if (/^function\s+\w+/.test(t)) {
    const match = t.match(/function\s+(\w+)\s*\((.*?)\)/);
    return buildASTNode("FunctionDeclaration", {
      name: match ? match[1] : "",
      params: match ? match[2] : "",
      raw: t,
    });
  }

  // class declaration
  if (/^class\s+\w+/.test(t)) {
    const match = t.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?/);
    return buildASTNode("ClassDeclaration", {
      name: match ? match[1] : "",
      superClass: match ? match[2] || null : null,
      raw: t,
    });
  }

  // constructor
  if (/^constructor\s*\(/.test(t)) {
    const match = t.match(/constructor\s*\((.*?)\)/);
    return buildASTNode("Constructor", {
      params: match ? match[1] : "",
      raw: t,
    });
  }

  // const/let/var variable declaration
  if (/^(const|let|var)\s+\w+/.test(t)) {
    const kind = t.match(/^(const|let|var)/)[1];
    const match = t.match(/^(?:const|let|var)\s+(\w+)\s*(?:=\s*(.+))?/);
    return buildASTNode("VariableDeclaration", {
      kind,
      name: match ? match[1] : "",
      value: match ? (match[2] || "").replace(/;$/, "") : "",
      raw: t,
    });
  }

  // if statement
  if (/^if\s*\(/.test(t)) {
    const match = t.match(/^if\s*\((.*?)\)/);
    return buildASTNode("IfStatement", {
      condition: match ? match[1] : "",
      raw: t,
    });
  }

  // else if
  if (/^}\s*else\s+if\s*\(/.test(t) || /^else\s+if\s*\(/.test(t)) {
    const match = t.match(/else\s+if\s*\((.*?)\)/);
    return buildASTNode("ElseIfStatement", {
      condition: match ? match[1] : "",
      raw: t,
    });
  }

  // else
  if (/^}\s*else\s*\{?$/.test(t) || /^else\s*\{?$/.test(t)) {
    return buildASTNode("ElseStatement", { raw: t });
  }

  // for loop
  if (/^for\s*\(/.test(t)) {
    const match = t.match(/^for\s*\((.*?)\)/);
    return buildASTNode("ForStatement", {
      init: match ? match[1] : "",
      raw: t,
    });
  }

  // for...of
  if (/^for\s*\(.*\bof\b/.test(t)) {
    const match = t.match(/for\s*\(\s*(?:const|let|var)?\s*(\w+)\s+of\s+(\w+)/);
    return buildASTNode("ForOfStatement", {
      variable: match ? match[1] : "",
      iterable: match ? match[2] : "",
      raw: t,
    });
  }

  // for...in
  if (/^for\s*\(.*\bin\b/.test(t)) {
    const match = t.match(/for\s*\(\s*(?:const|let|var)?\s*(\w+)\s+in\s+(\w+)/);
    return buildASTNode("ForInStatement", {
      variable: match ? match[1] : "",
      object: match ? match[2] : "",
      raw: t,
    });
  }

  // while loop
  if (/^while\s*\(/.test(t)) {
    const match = t.match(/^while\s*\((.*?)\)/);
    return buildASTNode("WhileStatement", {
      condition: match ? match[1] : "",
      raw: t,
    });
  }

  // do...while
  if (/^do\s*\{?$/.test(t)) {
    return buildASTNode("DoWhileStatement", { raw: t });
  }

  // switch
  if (/^switch\s*\(/.test(t)) {
    const match = t.match(/^switch\s*\((.*?)\)/);
    return buildASTNode("SwitchStatement", {
      discriminant: match ? match[1] : "",
      raw: t,
    });
  }

  // case
  if (/^case\s+.+:/.test(t)) {
    const match = t.match(/^case\s+(.+):/);
    return buildASTNode("CaseClause", {
      value: match ? match[1] : "",
      raw: t,
    });
  }

  // return
  if (/^return\b/.test(t)) {
    return buildASTNode("ReturnStatement", {
      value: t.replace(/^return\s*/, "").replace(/;$/, ""),
      raw: t,
    });
  }

  // break
  if (/^break;?$/.test(t)) {
    return buildASTNode("BreakStatement", { raw: t });
  }

  // continue
  if (/^continue;?$/.test(t)) {
    return buildASTNode("ContinueStatement", { raw: t });
  }

  // throw
  if (/^throw\s/.test(t)) {
    return buildASTNode("ThrowStatement", {
      argument: t.replace(/^throw\s+/, "").replace(/;$/, ""),
      raw: t,
    });
  }

  // try
  if (/^try\s*\{?$/.test(t)) {
    return buildASTNode("TryStatement", { raw: t });
  }

  // catch
  if (/^}\s*catch\s*\(/.test(t) || /^catch\s*\(/.test(t)) {
    const match = t.match(/catch\s*\(\s*(\w+)\s*\)/);
    return buildASTNode("CatchClause", {
      param: match ? match[1] : "e",
      raw: t,
    });
  }

  // finally
  if (/^}\s*finally\s*\{?$/.test(t) || /^finally\s*\{?$/.test(t)) {
    return buildASTNode("FinallyClause", { raw: t });
  }

  // console.log
  if (/console\.log\(/.test(t)) {
    const match = t.match(/console\.log\((.*)\)/);
    return buildASTNode("ConsoleLog", {
      args: match ? match[1] : "",
      raw: t,
    });
  }

  // .push(
  if (/\.\s*push\(/.test(t)) {
    const match = t.match(/(\w+)\.push\((.*)\)/);
    return buildASTNode("ArrayPush", {
      array: match ? match[1] : "",
      value: match ? match[2] : "",
      raw: t,
    });
  }

  // .pop(
  if (/\.\s*pop\(\)/.test(t)) {
    const match = t.match(/(\w+)\.pop\(\)/);
    return buildASTNode("ArrayPop", {
      array: match ? match[1] : "",
      raw: t,
    });
  }

  // assignment (a = b, not ==)
  if (/^\w[\w.[\]]*\s*=\s*[^=]/.test(t) && !/^(const|let|var|function|class|if|for|while|return|import|export)/.test(t)) {
    const match = t.match(/^([\w.[\]]+)\s*=\s*(.+)/);
    if (match) {
      return buildASTNode("AssignmentExpression", {
        left: match[1],
        right: match[2].replace(/;$/, ""),
        raw: t,
      });
    }
  }

  // function call
  if (/^\w[\w.]*\s*\(/.test(t)) {
    const match = t.match(/^([\w.]+)\s*\((.*)\)/);
    return buildASTNode("CallExpression", {
      callee: match ? match[1] : "",
      args: match ? match[2] : "",
      raw: t,
    });
  }

  // closing brace
  if (/^[}\])]/.test(t)) {
    return buildASTNode("BlockClose", { raw: t });
  }

  return buildASTNode("Unknown", { raw: t });
}

// ─── Main AST Generator ───────────────────────────────────────────────────────

export function generateAST(code, language = "javascript") {
  const tokens = tokenize(code);
  const ast = {
    type: "Program",
    language,
    body: [],
  };

  for (const token of tokens) {
    if (token.type === "COMMENT") {
      ast.body.push(buildASTNode("Comment", { value: token.value, line: token.line }));
    } else {
      const node = parseJSLine(token.value);
      node.line = token.line;
      ast.body.push(node);
    }
  }

  return ast;
}
