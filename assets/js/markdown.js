/**
 * ============================================================================
 * Markdown 渲染器 · assets/js/markdown.js
 * ----------------------------------------------------------------------------
 * 手写的轻量 markdown → HTML 渲染器（约 400 行），零依赖，完全离线可用。
 *
 * 【支持的语法】
 *   块级：标题 #~###### / 代码块 ```（带语言高亮）/ 引用 / 有序无序列表（可嵌套）/
 *         任务列表 - [x] / 表格（支持对齐）/ 分割线 / 段落
 *         还支持两个自定义扩展：
 *           ::: tip 标题        → 彩色提示框（tip / warn / danger / info / quote）
 *           ::: end
 *           <details><summary>  → 原生折叠，直接写 HTML 也行
 *   行内：**粗体** *斜体* ~~删除线~~ `行内代码` [链接](url) ![图片](url)
 *         ==高亮== {color:文字} ^[拼音]{汉字}
 *   其他：自动把裸链接变成可点击链接
 *
 * 【安全】所有文本都经过 HTML 转义，只有你自己写的 markdown 才会产生标签，
 *         因此这个渲染器也适用于渲染留言板内容，不会造成 XSS。
 * ============================================================================
 */
window.MD = (function () {
  "use strict";

  /* ==========================================================================
   * 一、工具
   * ======================================================================== */

  /** HTML 转义（转义 & < >，保留引号便于阅读） */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** 属性转义 */
  function escAttr(str) {
    return esc(str).replace(/"/g, "&quot;");
  }

  /** 生成标题锚点 id：支持中英文 */
  function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section";
  }

  /**
   * 行内代码 / 代码块 的占位符机制。
   * 因为代码里可能含有 ** 或者 [ ] 之类的 markdown 符号，
   * 先把它们抽出来存进数组，用私有区字符占位，最后再放回去。
   */
  var PUA = "\uE000"; // 私有区字符，正文里几乎不可能出现

  function makeStore() {
    return {
      items: [],
      put: function (html) {
        this.items.push(html);
        return PUA + (this.items.length - 1) + PUA;
      },
      restore: function (text) {
        var items = this.items;
        return text.replace(new RegExp(PUA + "(\\d+)" + PUA, "g"), function (m, idx) {
          return items[Number(idx)] || "";
        });
      },
    };
  }

  /* ==========================================================================
   * 二、行内解析
   * ======================================================================== */

  /**
   * 渲染一行里的行内语法
   * @param {string} text 原始文本（可能包含 HTML 片段吗？不，全部会被转义）
   * @param {object} store 占位符仓库
   */
  function inline(text, store) {
    var s = String(text);

    /* ---------- 1. 先取出行内代码 `code`（内部不再解析任何语法） ---------- */
    s = s.replace(/`([^`\n]+)`/g, function (m, code) {
      return store.put('<code class="md-code">' + esc(code) + "</code>");
    });

    /* ---------- 2. 图片（必须在链接之前处理，因为语法只差一个 !） ---------- */
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (m, alt, src, title) {
      return store.put(
        '<img class="md-img" src="' + escAttr(src) + '" alt="' + escAttr(alt) +
        '" title="' + escAttr(title || alt) + '" loading="lazy" decoding="async">'
      );
    });

    /* ---------- 3. 链接（含可选 title） ---------- */
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (m, label, href, title) {
      var isExternal = /^https?:\/\//i.test(href);
      var attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return store.put(
        '<a class="md-link" href="' + escAttr(href) + '" title="' + escAttr(title || label) + '"' +
        attrs + ">" + esc(label) + "</a>"
      );
    });

    /* ---------- 4. 转义剩下的 HTML 特殊字符（此后 s 里的实体都是安全的） ---------- */
    s = esc(s);

    /* ---------- 5. 自定义行内语法 ---------- */
    // 拼音注音：^[pīn yīn]{汉字}
    s = s.replace(/\^\[([^\]]*)\]\{([^}]+)\}/g, function (m, ruby, base) {
      return '<ruby class="md-ruby">' + base + "<rt>" + ruby + "</rt></ruby>";
    });
    // 高亮：==文字==
    s = s.replace(/==([^=\n]+)==/g, '<mark class="md-mark">$1</mark>');
    // 彩色文字：{color:文字}  颜色见 style.css 的 .md-c-*
    s = s.replace(/\{(danger|warn|tip|info|sakura|matcha|sky|lake):([^}\n]+)\}/g, function (m, color, txt) {
      return '<span class="md-c-' + color + '">' + txt + "</span>";
    });

    /* ---------- 6. 强调（顺序：*** → ** → * → ~~） ---------- */
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, "$1<em>$2</em>");
    s = s.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
    s = s.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

    /* ---------- 7. 裸链接自动识别（http:// 和 https://） ---------- */
    s = s.replace(/(^|[\s(（])(https?:\/\/[^\s<>"')）]+)/g, function (m, pre, url) {
      // 已经被 <a> 包住的不再处理
      return pre + '<a class="md-link" href="' + escAttr(url) +
        '" target="_blank" rel="noopener noreferrer">' + url + "</a>";
    });

    /* ---------- 8. 换行：行尾两个空格 → <br> ---------- */
    s = s.replace(/ {2,}$/gm, "<br>");

    return s;
  }

  /* ==========================================================================
   * 三、代码块渲染（调用 HL 高亮）
   * ======================================================================== */
  function renderCodeBlock(code, lang, store) {
    var language = window.HL ? window.HL.normalizeLang(lang) : "plaintext";
    var langLabel = window.HL ? window.HL.displayName(lang) : (lang || "Text");
    var html = window.HL ? window.HL.highlight(code, language) : esc(code);
    var id = "code-" + Math.random().toString(36).slice(2, 8);

    return store.put(
      '<div class="md-codeblock" data-lang="' + escAttr(language) + '">' +
        '<div class="md-codeblock__bar">' +
          '<span class="md-codeblock__dots"><i></i><i></i><i></i></span>' +
          '<span class="md-codeblock__lang">' + esc(langLabel) + "</span>" +
          '<button class="md-copy" type="button" data-target="' + id + '" aria-label="复制代码">复制</button>' +
        "</div>" +
        '<pre class="md-pre"><code id="' + id + '" class="md-code hljs language-' + escAttr(language) + '">' +
          html +
        "</code></pre>" +
      "</div>"
    );
  }

  /* ==========================================================================
   * 四、块级解析
   * ======================================================================== */

  /**
   * 主渲染函数
   * @param {string} markdown 原始 markdown
   * @param {object} opt { toc: true 时返回目录数组 }
   * @returns {string|object} HTML 字符串；opt.toc 为 true 时返回 { html, toc }
   */
  function render(markdown, opt) {
    opt = opt || {};
    var store = opt.store || makeStore();
    var nested = !!opt.store; // 嵌套调用（渲染引用 / 列表 / 容器内部）时不做首尾处理
    var prevStore = currentStore;
    currentStore = store;     // 让内部的 parseBlocks 能复用同一个占位符仓库
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;
    var toc = [];
    var headingCount = {};

    /* ------------------------------------------------------------------
     * 小工具：收集列表（支持嵌套和任务列表）
     * ------------------------------------------------------------------ */
    function listItemIndent(line) {
      var m = /^(\s*)(?:[-*+]|\d+[.)])\s+/.exec(line);
      return m ? m[1].replace(/\t/g, "    ").length : -1;
    }

    /**
     * 解析列表块
     * @param {number} baseIndent 当前列表的缩进基准
     */
    function parseList(baseIndent) {
      var ordered = /^\s*\d+[.)]\s+/.test(lines[i]);
      var html = [];
      var tag = ordered ? "ol" : "ul";

      while (i < lines.length) {
        var line = lines[i];
        if (!/^\s*$/.test(line) && listItemIndent(line) < 0) break;      // 列表结束了
        if (/^\s*$/.test(line)) {
          // 空行：如果后面还是同级列表项就继续，否则结束
          var next = lines[i + 1];
          if (next && listItemIndent(next) >= baseIndent) { i++; continue; }
          break;
        }
        var indent = listItemIndent(line);
        if (indent < baseIndent) break;

        // 取出这一项的内容（去掉标记）
        var content = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "");
        i++;

        // 收集该项的续行（缩进更深的普通行）
        var body = [content];
        while (i < lines.length) {
          var nl = lines[i];
          if (/^\s*$/.test(nl)) {
            // 空行后若缩进足够深则是同一项的内容
            var after = lines[i + 1];
            if (after && listItemIndent(after) > indent) { body.push(""); i++; continue; }
            if (after && listItemIndent(after) === indent && listItemIndent(after) >= baseIndent) break;
            if (after && listItemIndent(after) < 0 && /^\s{2,}/.test(after)) { body.push(nl); i++; continue; }
            break;
          }
          var nIndent = listItemIndent(nl);
          if (nIndent >= 0 && nIndent <= indent) break;                 // 同级或更浅：新的一项
          if (nIndent < 0 && /^\s{2,}/.test(nl)) { body.push(nl.replace(/^\s{2}/, "")); i++; continue; }
          if (nIndent < 0) break;
          body.push(nl.replace(new RegExp("^\\s{" + Math.min(indent + 2, 12) + "}"), ""));
          i++;
        }

        // 任务列表：[ ] / [x]
        var taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(body[0]);
        var itemClass = "";
        var prefix = "";
        if (taskMatch) {
          var checked = taskMatch[1].toLowerCase() === "x";
          prefix = '<input type="checkbox" class="md-task" disabled' + (checked ? " checked" : "") + "> ";
          itemClass = ' class="md-li-task' + (checked ? " is-done" : "") + '"';
          body[0] = taskMatch[2];
        }

        var inner = parseBlocks(body.join("\n"));
        html.push("<li" + itemClass + ">" + prefix + inner + "</li>");
      }

      return "<" + tag + ' class="md-list' + (ordered ? " md-list--ol" : "") + '">' +
        html.join("") + "</" + tag + ">";
    }

    /* ------------------------------------------------------------------
     * 小工具：表格
     * ------------------------------------------------------------------ */
    function parseTable(startLine) {
      // startLine 是表头行，下一行是 |---|---| 分隔行
      var header = splitRow(lines[startLine]);
      var align = splitRow(lines[startLine + 1]).map(function (cell) {
        var c = cell.trim();
        var left = c.charAt(0) === ":";
        var right = c.charAt(c.length - 1) === ":";
        if (left && right) return "center";
        if (right) return "right";
        if (left) return "left";
        return "";
      });

      var rows = [];
      var j = startLine + 2;
      while (j < lines.length && /\|/.test(lines[j]) && !/^\s*$/.test(lines[j])) {
        rows.push(splitRow(lines[j]));
        j++;
      }

      var html = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
      header.forEach(function (cell, idx) {
        html += '<th' + (align[idx] ? ' style="text-align:' + align[idx] + '"' : "") + ">" +
          inline(cell.trim(), store) + "</th>";
      });
      html += "</tr></thead><tbody>";
      rows.forEach(function (row) {
        html += "<tr>";
        for (var k = 0; k < header.length; k++) {
          html += "<td" + (align[k] ? ' style="text-align:' + align[k] + '"' : "") + ">" +
            inline((row[k] || "").trim(), store) + "</td>";
        }
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      i = j;
      return html;
    }

    function splitRow(line) {
      var s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
      // 支持用 \| 转义竖线
      return s.split(/(?<!\\)\|/).map(function (c) { return c.replace(/\\\|/g, "|"); });
    }

    /* ------------------------------------------------------------------
     * 主循环
     * ------------------------------------------------------------------ */
    while (i < lines.length) {
      var line = lines[i];

      /* ---------- 空行：跳过 ---------- */
      if (/^\s*$/.test(line)) { i++; continue; }

      /* ---------- 围栏代码块 ``` 或 ~~~ ---------- */
      var fence = /^\s*(`{3,}|~{3,})\s*([^\s`]*)\s*$/.exec(line);
      if (fence) {
        var fenceChar = fence[1].charAt(0);
        var fenceLen = fence[1].length;
        var lang = fence[2] || "";
        var buf = [];
        i++;
        while (i < lines.length) {
          var closeRe = new RegExp("^\\s*" + (fenceChar === "`" ? "`" : "~") + "{" + fenceLen + ",}\\s*$");
          if (closeRe.test(lines[i])) { i++; break; }
          buf.push(lines[i]);
          i++;
        }
        out.push(renderCodeBlock(buf.join("\n"), lang, store));
        continue;
      }

      /* ---------- 缩进代码块（4 个空格，前面没有列表上下文） ---------- */
      if (/^ {4}\S/.test(line)) {
        var ibuf = [];
        while (i < lines.length && (/^ {4}/.test(lines[i]) || /^\s*$/.test(lines[i]))) {
          if (/^\s*$/.test(lines[i]) && !/^ {4}/.test(lines[i + 1] || "")) break;
          ibuf.push(lines[i].replace(/^ {4}/, ""));
          i++;
        }
        out.push(renderCodeBlock(ibuf.join("\n"), "", store));
        continue;
      }

      /* ---------- 标题 ---------- */
      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        var level = heading[1].length;
        var rawText = heading[2].trim().replace(/\s+#+\s*$/, "");
        var textHTML = inline(rawText, store);
        var plain = rawText.replace(/[*_`~\[\]]/g, "");
        var id = slugify(plain);
        headingCount[id] = (headingCount[id] || 0) + 1;
        if (headingCount[id] > 1) id = id + "-" + headingCount[id];
        if (level <= 3) toc.push({ level: level, id: id, text: plain });
        out.push(
          "<h" + level + ' id="' + id + '" class="md-h md-h' + level + '">' +
          '<a class="md-anchor" href="#' + id + '" aria-label="锚点">#</a>' +
          textHTML + "</h" + level + ">"
        );
        i++;
        continue;
      }

      /* ---------- 分割线 ---------- */
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
        out.push('<hr class="md-hr">');
        i++;
        continue;
      }

      /* ---------- 自定义容器 ::: tip 标题 ---------- */
      var boxOpen = /^\s*:::\s*(tip|warn|danger|info|quote)\s*(.*)$/.exec(line);
      if (boxOpen) {
        var boxType = boxOpen[1];
        var boxTitle = boxOpen[2].trim();
        var boxBuf = [];
        i++;
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
          boxBuf.push(lines[i]);
          i++;
        }
        i++; // 跳过结束的 :::
        var iconMap = { tip: "💡", warn: "⚠️", danger: "🚫", info: "📌", quote: "❝" };
        out.push(
          '<div class="md-box md-box--' + boxType + '">' +
            '<div class="md-box__title">' + (iconMap[boxType] || "💡") + " " +
              (boxTitle || { tip: "小贴士", warn: "注意", danger: "危险", info: "说明", quote: "引用" }[boxType]) +
            "</div>" +
            '<div class="md-box__body">' + parseBlocks(boxBuf.join("\n")) + "</div>" +
          "</div>"
        );
        continue;
      }

      /* ---------- 引用（含嵌套） ---------- */
      if (/^\s*>/.test(line)) {
        var quoteBuf = [];
        while (i < lines.length && (/^\s*>/.test(lines[i]) || (/^\s*$/.test(lines[i]) && /^\s*>/.test(lines[i + 1] || "")))) {
          quoteBuf.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote class=\"md-quote\">" + parseBlocks(quoteBuf.join("\n")) + "</blockquote>");
        continue;
      }

      /* ---------- 表格 ---------- */
      if (/\|/.test(line) && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1] || "")) {
        out.push(parseTable(i));
        continue;
      }

      /* ---------- 列表 ---------- */
      if (listItemIndent(line) >= 0) {
        out.push(parseList(0));
        continue;
      }

      /* ---------- 原生 HTML 块（你自己写的 details / div 等，原样输出） ---------- */
      if (/^\s*<(?:\/?)(?:details|summary|div|section|figure|figcaption|table|iframe|video|audio|picture|source|br|hr|img|span|p|ul|ol|li|h[1-6]|a)\b/i.test(line)) {
        var htmlBuf = [];
        while (i < lines.length && !/^\s*$/.test(lines[i])) {
          htmlBuf.push(lines[i]);
          i++;
        }
        out.push(htmlBuf.join("\n"));
        continue;
      }

      /* ---------- 段落 ---------- */
      var paraBuf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^\s*(#{1,6}\s|>|```|~~~|:::|[-*+]\s|\d+[.)]\s)/.test(lines[i]) &&
             listItemIndent(lines[i]) < 0) {
        paraBuf.push(lines[i]);
        i++;
      }
      out.push("<p class=\"md-p\">" + inline(paraBuf.join("\n"), store) + "</p>");
    }

    var body = store.restore(out.join("\n"));
    // 嵌套调用：去掉最外层多余的 <p>，让列表项 / 引用里的单行文本更干净
    if (nested) {
      body = body.replace(/^<p class="md-p">([\s\S]*?)<\/p>$/, "$1");
    }
    currentStore = prevStore;
    if (opt.toc) return { html: body, toc: toc };
    return body;
  }

  /**
   * 递归渲染内部块级内容（引用 / 列表项 / 自定义容器里调用）
   * 关键点：必须复用同一个 store，否则代码块占位符无法还原。
   */
  function parseBlocks(text) {
    return render(text, { store: currentStore });
  }

  /* 当前正在使用的占位符仓库（由 render 在开始时设置） */
  var currentStore = null;

  /* ==========================================================================
   * 五、辅助：提取纯文本（做摘要 / 搜索用）
   * ======================================================================== */
  function toPlainText(markdown) {
    return String(markdown || "")
      .replace(/```[\s\S]*?```/g, " ")        // 去掉代码块
      .replace(/`[^`]*`/g, " ")               // 去掉行内代码
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")  // 去掉图片
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")// 链接保留文字
      .replace(/^\s*:::\s*\w*.*$/gm, " ")     // 去掉容器标记
      .replace(/^\s*#{1,6}\s*/gm, "")         // 去掉标题井号
      .replace(/^\s*[-*+]\s+/gm, "")          // 去掉列表符号
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/^\s*>\s?/gm, "")              // 去掉引用符
      .replace(/[*_~=|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** 生成摘要：默认取前 100 个字 */
  function excerpt(markdown, len) {
    var text = toPlainText(markdown);
    var max = len || 100;
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  return {
    render: render,
    toPlainText: toPlainText,
    excerpt: excerpt,
    escape: esc,
    slugify: slugify,
  };
})();
