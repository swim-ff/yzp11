/**
 * ============================================================================
 * 代码语法高亮 · assets/js/highlight.js
 * ----------------------------------------------------------------------------
 * 自己手写的轻量高亮器（约 200 行），不依赖 highlight.js / Prism 等 CDN 库，
 * 好处是：完全离线可用、体积小、可以按需扩展。
 *
 * 实现原理：
 *   1. 先把代码里的 & < > 转义成 HTML 实体（防止破坏页面结构）
 *   2. 从左到右扫描整段代码，在每一个位置依次尝试匹配：
 *      注释 → 字符串 → 数字 → 关键字 → 内置函数/常量
 *   3. 匹配到就包一层 <span class="tok-xxx">，没匹配到就原样输出一个字符
 *
 * 想加新语言？在 LANGS 里加一条配置即可：
 *   mylang: { keywords: [...], comment: [...], string: [...] , builtin: [...] }
 * ============================================================================
 */
window.HL = (function () {
  "use strict";

  /* ==========================================================================
   * 一、转义
   * ======================================================================== */
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** 把普通文本包成 span（内容已经转义过） */
  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + esc(text) + "</span>";
  }

  /* ==========================================================================
   * 二、语言定义
   *   comment: 注释语法（数组，越靠前的越优先匹配）
   *   string : 字符串字面量语法
   *   keywords / builtin / constants: 关键字、内置对象、常量
   * ======================================================================== */
  var C_KEYWORDS = [
    "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue",
    "return", "goto", "sizeof", "typedef", "struct", "union", "enum", "static", "const",
    "extern", "volatile", "register", "inline", "class", "public", "private", "protected",
    "virtual", "override", "final", "new", "delete", "this", "super", "extends", "implements",
    "interface", "abstract", "synchronized", "throws", "throw", "try", "catch", "finally",
    "package", "import", "instanceof", "null", "true", "false", "void", "int", "long",
    "short", "char", "float", "double", "bool", "boolean", "byte", "unsigned", "signed",
    "auto", "var", "let", "using", "namespace", "template", "typename", "operator", "friend",
    "record", "sealed", "permits", "yield", "await", "async", "lambda", "strictfp", "native",
    "transient", "assert", "with", "print", "val", "fun", "object", "when", "data", "suspend",
  ];

  var LANGS = {
    /* ---------------- JavaScript / TypeScript ---------------- */
    javascript: {
      keywords: [
        "var", "let", "const", "function", "return", "if", "else", "for", "while", "do",
        "switch", "case", "default", "break", "continue", "new", "delete", "typeof",
        "instanceof", "in", "of", "class", "extends", "super", "this", "try", "catch",
        "finally", "throw", "async", "await", "yield", "import", "export", "from", "as",
        "static", "get", "set", "true", "false", "null", "undefined", "void", "debugger",
      ],
      builtin: [
        "console", "window", "document", "Math", "JSON", "Object", "Array", "String",
        "Number", "Boolean", "Promise", "Map", "Set", "WeakMap", "Date", "RegExp",
        "Error", "Symbol", "Proxy", "Reflect", "fetch", "setTimeout", "setInterval",
        "clearTimeout", "clearInterval", "requestAnimationFrame", "parseInt", "parseFloat",
        "isNaN", "encodeURIComponent", "decodeURIComponent", "localStorage", "sessionStorage",
        "AbortController", "queueMicrotask", "structuredClone", "BigInt", "globalThis",
      ],
      comment: ["//", "/*"],
      string: ['"', "'", "`"],
    },

    /* ---------------- Python ---------------- */
    python: {
      keywords: [
        "def", "class", "return", "if", "elif", "else", "for", "while", "break", "continue",
        "pass", "import", "from", "as", "try", "except", "finally", "raise", "with", "lambda",
        "yield", "global", "nonlocal", "assert", "del", "in", "is", "not", "and", "or",
        "True", "False", "None", "async", "await", "match", "case", "self", "cls",
      ],
      builtin: [
        "print", "len", "range", "enumerate", "zip", "map", "filter", "sorted", "sum", "min",
        "max", "abs", "round", "int", "str", "float", "list", "dict", "set", "tuple", "bool",
        "type", "isinstance", "open", "input", "format", "repr", "hash", "id", "dir", "vars",
        "getattr", "setattr", "hasattr", "super", "property", "staticmethod", "classmethod",
        "bytes", "bytearray", "frozenset", "complex", "divmod", "pow", "any", "all", "next",
        "iter", "slice", "hex", "oct", "bin", "chr", "ord", "exec", "eval", "compile",
        "Exception", "ValueError", "TypeError", "KeyError", "IndexError", "RuntimeError",
        "StopIteration", "ZeroDivisionError", "FileNotFoundError", "AttributeError",
      ],
      comment: ["#"],
      string: ['"""', "'''", '"', "'"],
    },

    /* ---------------- HTML / XML ---------------- */
    html: {
      keywords: [],
      builtin: [],
      comment: ["<!--"],
      string: ['"', "'"],
      // HTML 单独处理（见 highlightHTML）
      special: "html",
    },

    /* ---------------- CSS ---------------- */
    css: {
      keywords: [],
      builtin: [
        "display", "position", "top", "left", "right", "bottom", "width", "height",
        "margin", "padding", "border", "background", "color", "font", "flex", "grid",
        "transform", "transition", "animation", "opacity", "z-index", "overflow", "content",
        "box-shadow", "border-radius", "backdrop-filter", "gap", "align-items", "justify-content",
      ],
      comment: ["/*"],
      string: ['"', "'"],
      special: "css",
    },

    /* ---------------- SQL ---------------- */
    sql: {
      keywords: [
        "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "INSERT", "INTO", "VALUES", "UPDATE",
        "SET", "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "ADD", "COLUMN", "INDEX",
        "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING",
        "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "AS", "LIKE", "IN", "BETWEEN",
        "IS", "NULL", "ASC", "DESC", "COUNT", "SUM", "AVG", "MAX", "MIN", "CASE", "WHEN",
        "THEN", "ELSE", "END", "IF", "EXISTS", "DATABASE", "SLEEP", "CONCAT", "SUBSTR",
        "ASCII", "LENGTH", "VERSION", "USER",
      ],
      builtin: ["information_schema", "users", "admin", "password", "username"],
      comment: ["--", "#", "/*"],
      string: ['"', "'"],
      caseInsensitiveKeywords: true,
    },

    /* ---------------- Bash / Shell ---------------- */
    bash: {
      keywords: [
        "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac",
        "function", "return", "in", "export", "local", "readonly", "source", "alias",
        "echo", "exit", "cd", "set", "unset", "shift", "trap", "eval", "exec",
      ],
      builtin: [
        "ls", "cat", "grep", "sed", "awk", "find", "xargs", "sort", "uniq", "head", "tail",
        "wc", "cut", "tr", "chmod", "chown", "ps", "kill", "top", "df", "du", "tar", "zip",
        "unzip", "curl", "wget", "ssh", "scp", "rsync", "git", "npm", "node", "python",
        "python3", "pip", "sudo", "apt", "yum", "systemctl", "docker", "make", "tree",
        "which", "type", "history", "jobs", "fg", "bg", "nohup", "pwd", "mkdir", "rm",
        "cp", "mv", "ln", "touch", "file", "strings", "xxd", "less", "more", "diff",
        "ping", "traceroute", "dig", "nc", "ss", "netstat", "ip", "ifconfig", "free",
        "uptime", "journalctl", "man", "less",
      ],
      comment: ["#"],
      string: ['"', "'"],
    },

    /* ---------------- JSON ---------------- */
    json: {
      keywords: ["true", "false", "null"],
      builtin: [],
      comment: [],
      string: ['"'],
    },

    /* ---------------- Markdown（用于展示 md 源码） ---------------- */
    markdown: {
      keywords: ["title", "date", "tags", "category", "excerpt", "cover"],
      builtin: [],
      comment: [],
      string: ['"', "'"],
    },

    /* ---------------- 纯文本（不解析，只转义） ---------------- */
    plaintext: { keywords: [], builtin: [], comment: [], string: [], plain: true },
    text: { keywords: [], builtin: [], comment: [], string: [], plain: true },
  };

  /* 语言别名表：写 ```js 也能识别 */
  var ALIAS = {
    js: "javascript", ts: "javascript", typescript: "javascript", jsx: "javascript",
    mjs: "javascript", cjs: "javascript", node: "javascript",
    py: "python", python3: "python",
    sh: "bash", shell: "bash", zsh: "bash", console: "bash", powershell: "bash",
    htm: "html", xml: "html", vue: "html", svg: "html",
    scss: "css", less: "css", sass: "css",
    mysql: "sql", sqlite: "sql", postgres: "sql",
    c: "c", cpp: "c", "c++": "c", cc: "c", java: "c", csharp: "c", cs: "c", go: "c",
    rust: "c", rs: "c", kotlin: "c", kt: "c", swift: "c", php: "c", ruby: "c",
    jl: "python", r: "python", matlab: "python",
    yml: "json", yaml: "json", toml: "json", ini: "json", conf: "json",
    text: "plaintext", txt: "plaintext", log: "plaintext", diff: "plaintext",
    md: "markdown", mdown: "markdown",
    "": "plaintext",
  };

  /* 把 C 系关键字补进 c 语言 */
  LANGS.c = {
    keywords: C_KEYWORDS,
    builtin: [
      "printf", "scanf", "malloc", "free", "sizeof", "strlen", "strcpy", "strcmp", "memcpy",
      "memset", "cin", "cout", "endl", "std", "string", "vector", "map", "set", "queue",
      "stack", "pair", "sort", "max", "min", "abs", "System", "out", "println", "String",
      "Integer", "ArrayList", "HashMap", "List", "Map", "Set", "Math", "Scanner", "main",
      "println", "fmt", "len", "append", "make", "func", "print", "println", "derive", "impl",
      "pub", "mut", "match", "Some", "None", "Ok", "Err", "println", "require", "puts",
    ],
    comment: ["//", "/*"],
    string: ['"', "'"],
  };

  /* ==========================================================================
   * 三、词法扫描核心
   * ======================================================================== */

  /**
   * 把一段代码按「token」切开，再着色
   * @param {string} code  原始代码
   * @param {object} cfg   语言配置
   */
  function tokenize(code, cfg) {
    var keywords = cfg.keywords || [];
    var builtins = cfg.builtin || [];

    /* --- 预处理 1：把关键字/内置对象按长度排序，避免 "in" 抢了 "instanceof" --- */
    var kwSorted = keywords.slice().sort(function (a, b) { return b.length - a.length; });
    var biSorted = builtins.slice().sort(function (a, b) { return b.length - a.length; });

    /* --- 注释与字符串定界符，长的排前面（/* 要优先于 /） --- */
    var comments = (cfg.comment || []).slice().sort(function (a, b) { return b.length - a.length; });
    var strings = (cfg.string || []).slice().sort(function (a, b) { return b.length - a.length; });

    var out = "";
    var i = 0;
    var n = code.length;
    /* 前一个有效字符，用来判断 / 是正则还是除法（JS 里用得到） */
    var prevChar = "";

    while (i < n) {
      var rest = code.slice(i);
      var ch = code.charAt(i);
      var matched = false;

      /* ---------- 1. 注释 ---------- */
      for (var ci = 0; ci < comments.length; ci++) {
        var cs = comments[ci];
        if (rest.indexOf(cs) === 0) {
          var endIdx;
          if (cs === "/*" || cs === "<!--") {
            var closer = cs === "/*" ? "*/" : "-->";
            endIdx = code.indexOf(closer, i + cs.length);
            endIdx = endIdx === -1 ? n : endIdx + closer.length;
          } else {
            // 单行注释：吃到行尾
            endIdx = code.indexOf("\n", i);
            endIdx = endIdx === -1 ? n : endIdx;
          }
          out += span("comment", code.slice(i, endIdx));
          i = endIdx;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      /* ---------- 2. 字符串（支持转义） ---------- */
      for (var si = 0; si < strings.length; si++) {
        var q = strings[si];
        if (rest.indexOf(q) === 0) {
          var j = i + q.length;
          while (j < n) {
            if (code.charAt(j) === "\\") { j += 2; continue; }
            if (code.substr(j, q.length) === q) { j += q.length; break; }
            if (q.length === 1 && code.charAt(j) === "\n") break;  // 单引号不跨行
            j++;
          }
          out += span("string", code.slice(i, j));
          i = j;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      /* ---------- 3. 数字 ---------- */
      // 0x1f / 3.14 / 1e-5 / 1_000_000 / 255
      var numMatch = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?)/.exec(rest);
      if (numMatch && !/[A-Za-z0-9_$]/.test(prevChar)) {
        out += span("number", numMatch[0]);
        i += numMatch[0].length;
        prevChar = numMatch[0].slice(-1);
        continue;
      }

      /* ---------- 4. 标识符：关键字 / 内置 / 普通 ---------- */
      var idMatch = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(rest);
      if (idMatch) {
        var word = idMatch[0];
        var cmp = cfg.caseInsensitiveKeywords ? word.toUpperCase() : word;
        var kwList = cfg.caseInsensitiveKeywords
          ? kwSorted.map(function (k) { return k.toUpperCase(); })
          : kwSorted;
        var biList = cfg.caseInsensitiveKeywords
          ? biSorted.map(function (k) { return k.toUpperCase(); })
          : biSorted;

        if (kwList.indexOf(cmp) !== -1) out += span("keyword", word);
        else if (biList.indexOf(cmp) !== -1) out += span("builtin", word);
        else out += span("name", word);

        i += word.length;
        prevChar = word.slice(-1);
        continue;
      }

      /* ---------- 5. 运算符 / 标点 ---------- */
      var opMatch = /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|\?\?|\?\.|\.\.\.|[-+*/%<>=!&|^~?:.,;(){}\[\]])/.exec(rest);
      if (opMatch) {
        out += span("op", opMatch[0]);
        i += opMatch[0].length;
        prevChar = opMatch[0].slice(-1);
        continue;
      }

      /* ---------- 6. 其他字符（空格、换行、中文等） ---------- */
      out += esc(ch);
      if (!/\s/.test(ch)) prevChar = ch;
      i++;
    }

    return out;
  }

  /* ==========================================================================
   * 四、HTML 高亮（规则和通用扫描差别较大，单独实现）
   * ======================================================================== */
  function highlightHTML(code) {
    var out = "";
    var i = 0, n = code.length;

    while (i < n) {
      // 注释
      if (code.substr(i, 4) === "<!--") {
        var ce = code.indexOf("-->", i);
        ce = ce === -1 ? n : ce + 3;
        out += span("comment", code.slice(i, ce));
        i = ce;
        continue;
      }
      // 标签
      if (code.charAt(i) === "<") {
        var te = code.indexOf(">", i);
        if (te === -1) { out += esc(code.slice(i)); break; }
        var tag = code.slice(i, te + 1);
        // 标签名
        var tagMatch = /^<\/?\s*([A-Za-z0-9-]+)/.exec(tag);
        if (tagMatch) {
          out += esc(tag.slice(0, tagMatch[0].length - tagMatch[1].length));
          out += span("keyword", tagMatch[1]);
          var attrPart = tag.slice(tagMatch[0].length, tag.length - 1);
          // 属性名 = 值
          attrPart = attrPart.replace(
            /([A-Za-z_:][-A-Za-z0-9_:.]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?/g,
            function (m, name, eq, val) {
              var s = span("builtin", name) + esc(eq);
              if (val) s += span("string", val);
              return s;
            }
          );
          out += attrPart + esc(tag.slice(-1));
        } else {
          out += span("keyword", tag);
        }
        i = te + 1;
        continue;
      }
      // <style> / <script> 之间的文本按普通文本处理
      var nextTag = code.indexOf("<", i);
      if (nextTag === -1) nextTag = n;
      out += span("name", code.slice(i, nextTag));
      i = nextTag;
    }
    return out;
  }

  /* ==========================================================================
   * 五、CSS 高亮
   * ======================================================================== */
  function highlightCSS(code) {
    // 先处理注释，再按「选择器 / 属性 / 值」粗粒度着色
    var parts = code.split(/(\/\*[\s\S]*?\*\/)/g);
    return parts
      .map(function (part) {
        if (part.indexOf("/*") === 0) return span("comment", part);
        return part.replace(/([-A-Za-z]+)(\s*:\s*)([^;{}]+)(;?)/g, function (m, prop, colon, val, semi) {
          // 值里面再挑出数字和颜色
          var v = esc(val)
            .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="tok-number">$1</span>')
            .replace(/(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\b)/g, '<span class="tok-number">$1</span>')
            .replace(/(\b(?:rgba?|hsla?|url|calc|var|linear-gradient|radial-gradient|blur|saturate|translateY|translateX|scale|rotate)\b)/g,
              '<span class="tok-builtin">$1</span>');
          return span("builtin", prop) + esc(colon) + v + esc(semi);
        }).replace(/([^{};]+)(\{)/g, function (m, sel, brace) {
          return span("keyword", sel.replace(/\s+$/, "")) + esc(m.slice(sel.replace(/\s+$/, "").length)) + esc(brace);
        });
      })
      .join("");
  }

  /* ==========================================================================
   * 六、对外接口
   * ======================================================================== */

  /** 把语言别名规范化 */
  function normalizeLang(lang) {
    if (!lang) return "plaintext";
    var key = String(lang).toLowerCase().trim();
    if (LANGS[key]) return key;
    if (ALIAS[key]) return ALIAS[key];
    return "plaintext";
  }

  /**
   * 高亮代码
   * @param {string} code 源代码
   * @param {string} lang 语言名（可为空）
   * @returns {string} HTML 字符串（已转义，安全）
   */
  function highlight(code, lang) {
    var name = normalizeLang(lang);
    var cfg = LANGS[name] || LANGS.plaintext;

    if (cfg.plain) return esc(code);
    if (cfg.special === "html") return highlightHTML(code);
    if (cfg.special === "css") return highlightCSS(code);
    return tokenize(code, cfg);
  }

  /** 语言显示名（代码块右上角那个小标签） */
  var DISPLAY = {
    javascript: "JavaScript", python: "Python", html: "HTML", css: "CSS", sql: "SQL",
    bash: "Shell", json: "JSON", c: "C / Java 系", markdown: "Markdown", plaintext: "Text",
  };
  function displayName(lang) {
    var k = normalizeLang(lang);
    return DISPLAY[k] || (lang ? String(lang) : "Text");
  }

  return {
    highlight: highlight,
    normalizeLang: normalizeLang,
    displayName: displayName,
    escape: esc,
    LANGS: LANGS,
  };
})();
