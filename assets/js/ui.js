/**
 * ============================================================================
 * UI 工具函数 · assets/js/ui.js
 * ----------------------------------------------------------------------------
 * 负责三件事：
 *   1. 生成 SVG 插画（封面图、相册图、头像）—— 不依赖任何外部图片，
 *      这样站点离线可用、秒开、永远不会出现「图挂了」的破图。
 *   2. 通用小工具：DOM 选择、日期格式化、防抖节流、转义。
 *   3. 主题配色表：art 名字 → 渐变配色 + 图案类型。
 *
 * 用法：
 *   UI.artSVG("lake-rain", { w: 800, h: 450 })   → 返回 SVG 字符串
 *   UI.artDataURI("sky")                          → 返回可直接放进 <img src> 的 data URI
 *   UI.coverHTML(post)                            → 返回封面 <img> 的 HTML
 * ============================================================================
 */
window.UI = (function () {
  "use strict";

  /* ==========================================================================
   * 一、主题配色与图案
   * pattern 决定这张插画画什么：
   *   waves 湖面波纹 / rain 雨丝 / hills 草原 / sky 云朵 / sun 落日
   *   sakura 花瓣 / matcha 抹茶气泡 / bokeh 光斑 / terminal 终端窗口
   *   night 星月 / forest 树林 / ocean 海浪 / desk 书桌 / code 代码行
   *   puzzle 拼图块 / flag 旗帜
   * ======================================================================== */
  var THEMES = {
    /* 墨绿湖面 + 雨 —— 首页首屏的配色，用于「雨夜」相关文章 */
    "lake-rain": { from: "#04140f", to: "#1f6b54", accent: "#a6dcc4", pattern: "rain" },
    lake: { from: "#07211a", to: "#2f8f6f", accent: "#a6dcc4", pattern: "waves" },
    rain: { from: "#16323f", to: "#4b7f96", accent: "#cfe9f5", pattern: "rain" },

    /* 宫崎骏草原感 */
    grass: { from: "#8fd0f0", to: "#6faa4c", accent: "#fff6cf", pattern: "hills" },
    hills: { from: "#9dd7f2", to: "#7fbb5c", accent: "#fff3c4", pattern: "hills" },
    sky: { from: "#6fb3d9", to: "#cdeafc", accent: "#ffffff", pattern: "sky" },
    sunset: { from: "#ffb37a", to: "#ef7f9b", accent: "#fff0c9", pattern: "sun" },

    /* 治愈系小物 */
    sakura: { from: "#ffe0ea", to: "#ef8fae", accent: "#fff7fa", pattern: "sakura" },
    matcha: { from: "#dff0cf", to: "#7fb069", accent: "#f7fff0", pattern: "bokeh" },
    bokeh: { from: "#f6e7c8", to: "#e0a86a", accent: "#fffdf5", pattern: "bokeh" },

    /* 技术感 */
    terminal: { from: "#0a1f14", to: "#123a26", accent: "#7ef2a8", pattern: "terminal" },
    code: { from: "#12233a", to: "#2b4a6f", accent: "#8fd6ff", pattern: "code" },
    night: { from: "#141a35", to: "#3b3f6b", accent: "#ffe9a8", pattern: "night" },
    forest: { from: "#1f3d2b", to: "#4d7a45", accent: "#d9f5c0", pattern: "forest" },
    ocean: { from: "#1d5b7a", to: "#69b6d6", accent: "#eafaff", pattern: "waves" },
    desk: { from: "#e8d6bd", to: "#b98d63", accent: "#fff8ec", pattern: "desk" },
    puzzle: { from: "#cdbcf0", to: "#7f6dc0", accent: "#f4efff", pattern: "puzzle" },
    flag: { from: "#2b3a55", to: "#5f7ea8", accent: "#ffd479", pattern: "flag" },
  };

  /* 主题名列表，写 markdown front matter 时可以参考 */
  var THEME_NAMES = Object.keys(THEMES);

  function theme(name) {
    return THEMES[name] || THEMES.grass;
  }

  /* ==========================================================================
   * 二、SVG 插画生成
   * ======================================================================== */

  /** 简易可复现的伪随机数（同一 seed 永远得到同一张图，避免每次刷新都变样） */
  function rng(seed) {
    var s = 0;
    var str = String(seed || "seed");
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) % 2147483647;
    if (s <= 0) s = 12345;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /** 生成一个唯一 id，避免同页面多个 SVG 的渐变 id 冲突 */
  var uidSeed = 0;
  function uid(prefix) {
    uidSeed += 1;
    return prefix + "-" + uidSeed + "-" + Math.floor(Math.random() * 1e6).toString(36);
  }

  /* ---------- 各种图案的绘制函数：返回 SVG 片段 ---------- */

  /** 湖面波纹：一圈圈椭圆，越远越小 */
  function patWaves(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 9; i++) {
      var cy = h * (0.46 + i * 0.065);
      var rx = w * (0.09 + i * 0.05);
      var ry = 5 + i * 1.7;
      out +=
        '<ellipse cx="' + (w * (0.15 + r() * 0.7)).toFixed(1) + '" cy="' + cy.toFixed(1) +
        '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) +
        '" fill="none" stroke="' + t.accent + '" stroke-width="' + (1.6 - i * 0.12).toFixed(2) +
        '" opacity="' + (0.5 - i * 0.045).toFixed(2) + '"/>';
    }
    return out;
  }

  /** 雨丝 */
  function patRain(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 46; i++) {
      var x = r() * w;
      var y = r() * h * 0.75;
      var len = 14 + r() * 26;
      out +=
        '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) +
        '" x2="' + (x - len * 0.34).toFixed(1) + '" y2="' + (y + len).toFixed(1) +
        '" stroke="' + t.accent + '" stroke-width="' + (0.9 + r() * 1.1).toFixed(2) +
        '" opacity="' + (0.12 + r() * 0.36).toFixed(2) + '" stroke-linecap="round"/>';
    }
    // 水面上再补几圈涟漪
    for (var j = 0; j < 5; j++) {
      var cx = w * (0.1 + r() * 0.8);
      var cy = h * (0.78 + r() * 0.18);
      out +=
        '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
        '" rx="' + (8 + r() * 26).toFixed(1) + '" ry="' + (2 + r() * 5).toFixed(1) +
        '" fill="none" stroke="' + t.accent + '" stroke-width="1.4" opacity="' +
        (0.25 + r() * 0.35).toFixed(2) + '"/>';
    }
    return out;
  }

  /** 草原山丘：三层起伏 + 小房子/树 */
  function patHills(r, w, h, t) {
    var out = "";
    out +=
      '<circle cx="' + (w * 0.78).toFixed(1) + '" cy="' + (h * 0.24).toFixed(1) +
      '" r="' + (h * 0.13).toFixed(1) + '" fill="' + t.accent + '" opacity="0.85"/>';
    for (var i = 0; i < 3; i++) {
      var base = h * (0.6 + i * 0.13);
      var amp = h * (0.13 - i * 0.03);
      var d = "M0 " + base.toFixed(1);
      for (var x = 0; x <= w; x += w / 4) {
        var y = base - Math.sin((x / w) * Math.PI * (1 + i)) * amp - r() * h * 0.035;
        d += " Q" + (x - w / 8).toFixed(1) + " " + (y - amp * 0.4).toFixed(1) +
             " " + x.toFixed(1) + " " + y.toFixed(1);
      }
      d += " L" + w + " " + h + " L0 " + h + " Z";
      out += '<path d="' + d + '" fill="' + t.from + '" opacity="' + (0.32 + i * 0.22).toFixed(2) + '"/>';
    }
    // 一棵小树
    var tx = w * 0.2, ty = h * 0.72;
    out += '<rect x="' + (tx - 2).toFixed(1) + '" y="' + ty.toFixed(1) + '" width="4" height="' +
           (h * 0.12).toFixed(1) + '" fill="#5b4636" opacity="0.75"/>' +
           '<circle cx="' + tx.toFixed(1) + '" cy="' + (ty - 6).toFixed(1) + '" r="' + (h * 0.085).toFixed(1) +
           '" fill="' + t.accent + '" opacity="0.55"/>';
    return out;
  }

  /** 天空云朵 */
  function patSky(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 5; i++) {
      var cx = r() * w, cy = h * (0.16 + r() * 0.5), s = (0.6 + r() * 0.9) * h * 0.1;
      out +=
        '<g opacity="' + (0.5 + r() * 0.45).toFixed(2) + '">' +
        '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + (s * 1.9).toFixed(1) + '" ry="' + s.toFixed(1) + '" fill="#fff"/>' +
        '<ellipse cx="' + (cx + s).toFixed(1) + '" cy="' + (cy - s * 0.5).toFixed(1) + '" rx="' + (s * 1.15).toFixed(1) + '" ry="' + (s * 0.85).toFixed(1) + '" fill="#fff"/>' +
        '<ellipse cx="' + (cx - s * 1.2).toFixed(1) + '" cy="' + (cy + s * 0.2).toFixed(1) + '" rx="' + (s * 0.95).toFixed(1) + '" ry="' + (s * 0.7).toFixed(1) + '" fill="#fff"/>' +
        "</g>";
    }
    // 飞鸟
    for (var j = 0; j < 4; j++) {
      var bx = w * (0.15 + r() * 0.7), by = h * (0.2 + r() * 0.3), bs = 5 + r() * 7;
      out += '<path d="M' + bx.toFixed(1) + " " + by.toFixed(1) +
        " q" + bs.toFixed(1) + " " + (-bs).toFixed(1) + " " + (bs * 2).toFixed(1) + " 0" +
        " q" + bs.toFixed(1) + " " + (-bs).toFixed(1) + " " + (bs * 2).toFixed(1) + " 0" +
        '" fill="none" stroke="' + t.from + '" stroke-width="1.6" opacity="0.45"/>';
    }
    return out;
  }

  /** 落日与云层 */
  function patSun(r, w, h, t) {
    var out =
      '<circle cx="' + (w * 0.62).toFixed(1) + '" cy="' + (h * 0.42).toFixed(1) + '" r="' +
      (h * 0.2).toFixed(1) + '" fill="' + t.accent + '" opacity="0.9"/>' +
      '<circle cx="' + (w * 0.62).toFixed(1) + '" cy="' + (h * 0.42).toFixed(1) + '" r="' +
      (h * 0.31).toFixed(1) + '" fill="' + t.accent + '" opacity="0.22"/>';
    for (var i = 0; i < 7; i++) {
      var y = h * (0.3 + i * 0.09);
      out +=
        '<rect x="0" y="' + y.toFixed(1) + '" width="' + w + '" height="' + (3 + r() * 7).toFixed(1) +
        '" rx="3" fill="#fff" opacity="' + (0.12 + r() * 0.26).toFixed(2) + '"/>';
    }
    return out;
  }

  /** 樱花花瓣 */
  function patSakura(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 26; i++) {
      var x = r() * w, y = r() * h, s = 5 + r() * 12, rot = r() * 360;
      out +=
        '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(0) + ')" opacity="' +
        (0.35 + r() * 0.5).toFixed(2) + '">' +
        '<path d="M0 0 C' + (s * 0.9).toFixed(1) + " " + (-s * 0.5).toFixed(1) + " " + (s * 1.2).toFixed(1) + " " +
        (s * 0.9).toFixed(1) + " 0 " + (s * 1.7).toFixed(1) + " C" + (-s * 1.2).toFixed(1) + " " + (s * 0.9).toFixed(1) +
        " " + (-s * 0.9).toFixed(1) + " " + (-s * 0.5).toFixed(1) + ' 0 0 Z" fill="' + t.accent + '"/>' +
        "</g>";
    }
    return out;
  }

  /** 光斑 / 散景 */
  function patBokeh(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 16; i++) {
      out +=
        '<circle cx="' + (r() * w).toFixed(1) + '" cy="' + (r() * h).toFixed(1) + '" r="' +
        (8 + r() * h * 0.16).toFixed(1) + '" fill="' + t.accent + '" opacity="' +
        (0.07 + r() * 0.24).toFixed(2) + '"/>';
    }
    return out;
  }

  /** 终端窗口：带红黄绿三个圆点和几行代码 */
  function patTerminal(r, w, h, t) {
    var pad = w * 0.08;
    var out =
      '<rect x="' + pad.toFixed(1) + '" y="' + (h * 0.16).toFixed(1) + '" width="' + (w - pad * 2).toFixed(1) +
      '" height="' + (h * 0.68).toFixed(1) + '" rx="12" fill="#02150e" opacity="0.72" stroke="' + t.accent +
      '" stroke-opacity="0.35"/>' +
      '<circle cx="' + (pad + 18).toFixed(1) + '" cy="' + (h * 0.24).toFixed(1) + '" r="5" fill="#ff6b6b"/>' +
      '<circle cx="' + (pad + 36).toFixed(1) + '" cy="' + (h * 0.24).toFixed(1) + '" r="5" fill="#ffd479"/>' +
      '<circle cx="' + (pad + 54).toFixed(1) + '" cy="' + (h * 0.24).toFixed(1) + '" r="5" fill="#7ef2a8"/>';
    for (var i = 0; i < 8; i++) {
      var y = h * (0.33 + i * 0.062);
      var lw = (w - pad * 2 - 30) * (0.25 + r() * 0.7);
      out +=
        '<rect x="' + (pad + 16).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (10 + r() * 24).toFixed(1) +
        '" height="4" rx="2" fill="' + t.accent + '" opacity="0.85"/>' +
        '<rect x="' + (pad + 44).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + lw.toFixed(1) +
        '" height="4" rx="2" fill="' + t.accent + '" opacity="0.32"/>';
    }
    return out;
  }

  /** 代码行 */
  function patCode(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 12; i++) {
      var y = h * (0.14 + i * 0.066);
      var indent = w * (0.08 + (i % 4) * 0.05);
      out +=
        '<rect x="' + indent.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' +
        ((w * 0.72 - indent) * (0.3 + r() * 0.7)).toFixed(1) + '" height="5" rx="2.5" fill="' +
        t.accent + '" opacity="' + (0.18 + r() * 0.5).toFixed(2) + '"/>';
    }
    out += '<text x="' + (w * 0.08).toFixed(1) + '" y="' + (h * 0.93).toFixed(1) +
      '" font-family="monospace" font-size="' + (h * 0.06).toFixed(1) + '" fill="' + t.accent +
      '" opacity="0.7">&lt;/&gt;</text>';
    return out;
  }

  /** 星月夜空 */
  function patNight(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 42; i++) {
      out +=
        '<circle cx="' + (r() * w).toFixed(1) + '" cy="' + (r() * h * 0.8).toFixed(1) + '" r="' +
        (0.7 + r() * 1.7).toFixed(2) + '" fill="#fff" opacity="' + (0.3 + r() * 0.7).toFixed(2) + '"/>';
    }
    // 弯月
    var mx = w * 0.75, my = h * 0.28, mr = h * 0.14;
    out +=
      '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="' + mr.toFixed(1) + '" fill="' + t.accent + '"/>' +
      '<circle cx="' + (mx - mr * 0.42).toFixed(1) + '" cy="' + (my - mr * 0.22).toFixed(1) + '" r="' + (mr * 0.92).toFixed(1) +
      '" fill="' + t.from + '"/>';
    // 远处山影
    out += '<path d="M0 ' + (h * 0.82).toFixed(1) + " L" + (w * 0.22).toFixed(1) + " " + (h * 0.62).toFixed(1) +
      " L" + (w * 0.4).toFixed(1) + " " + (h * 0.8).toFixed(1) + " L" + (w * 0.62).toFixed(1) + " " + (h * 0.58).toFixed(1) +
      " L" + w + " " + (h * 0.84).toFixed(1) + " L" + w + " " + h + " L0 " + h +
      '" fill="' + t.from + '" opacity="0.85"/>';
    return out;
  }

  /** 树林 */
  function patForest(r, w, h, t) {
    var out = "";
    for (var i = 0; i < 14; i++) {
      var x = w * (0.03 + i * 0.07) + r() * 12;
      var th = h * (0.3 + r() * 0.34);
      var tw = th * 0.36;
      out +=
        '<path d="M' + x.toFixed(1) + " " + (h * 0.9).toFixed(1) + " L" + (x + tw / 2).toFixed(1) + " " +
        (h * 0.9 - th).toFixed(1) + " L" + (x + tw).toFixed(1) + " " + (h * 0.9).toFixed(1) + ' Z" fill="' +
        t.accent + '" opacity="' + (0.16 + r() * 0.3).toFixed(2) + '"/>';
    }
    out += '<ellipse cx="' + (w * 0.5).toFixed(1) + '" cy="' + (h * 0.52).toFixed(1) + '" rx="' + (w * 0.3).toFixed(1) +
      '" ry="' + (h * 0.18).toFixed(1) + '" fill="#fff" opacity="0.1"/>';
    return out;
  }

  /** 书桌：纸张 + 咖啡杯 */
  function patDesk(r, w, h, t) {
    var out =
      '<rect x="' + (w * 0.12).toFixed(1) + '" y="' + (h * 0.24).toFixed(1) + '" width="' + (w * 0.52).toFixed(1) +
      '" height="' + (h * 0.56).toFixed(1) + '" rx="10" fill="' + t.accent + '" opacity="0.92" transform="rotate(-3 ' +
      (w * 0.38).toFixed(1) + " " + (h * 0.52).toFixed(1) + ')"/>';
    for (var i = 0; i < 7; i++) {
      out +=
        '<rect x="' + (w * 0.18).toFixed(1) + '" y="' + (h * (0.34 + i * 0.06)).toFixed(1) + '" width="' +
        (w * 0.34 * (0.4 + r() * 0.6)).toFixed(1) + '" height="4" rx="2" fill="' + t.from + '" opacity="0.35"/>';
    }
    out +=
      '<rect x="' + (w * 0.7).toFixed(1) + '" y="' + (h * 0.5).toFixed(1) + '" width="' + (w * 0.16).toFixed(1) +
      '" height="' + (h * 0.28).toFixed(1) + '" rx="8" fill="#fff" opacity="0.9"/>' +
      '<ellipse cx="' + (w * 0.78).toFixed(1) + '" cy="' + (h * 0.5).toFixed(1) + '" rx="' + (w * 0.08).toFixed(1) +
      '" ry="' + (h * 0.035).toFixed(1) + '" fill="#6b4a2f" opacity="0.85"/>' +
      '<path d="M' + (w * 0.86).toFixed(1) + " " + (h * 0.56).toFixed(1) + " q" + (w * 0.06).toFixed(1) + " " +
      (h * 0.06).toFixed(1) + " 0 " + (h * 0.13).toFixed(1) + '" fill="none" stroke="#fff" stroke-width="6" opacity="0.85"/>';
    return out;
  }

  /** 拼图块：象征「设计模式」这类抽象知识 */
  function patPuzzle(r, w, h, t) {
    var out = "";
    var size = h * 0.3;
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 3; col++) {
        var x = w * 0.14 + col * size * 1.14;
        var y = h * 0.2 + row * size * 1.14;
        out +=
          '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + size.toFixed(1) + '" height="' +
          size.toFixed(1) + '" rx="' + (size * 0.16).toFixed(1) + '" fill="' + t.accent + '" opacity="' +
          (0.2 + r() * 0.5).toFixed(2) + '" stroke="#fff" stroke-opacity="0.35"/>';
      }
    }
    return out;
  }

  /** 旗帜：CTF 味 */
  function patFlag(r, w, h, t) {
    var out =
      '<rect x="' + (w * 0.3).toFixed(1) + '" y="' + (h * 0.18).toFixed(1) + '" width="6" height="' + (h * 0.62).toFixed(1) +
      '" rx="3" fill="#fff" opacity="0.85"/>' +
      '<path d="M' + (w * 0.3 + 6).toFixed(1) + " " + (h * 0.2).toFixed(1) + " L" + (w * 0.74).toFixed(1) + " " +
      (h * 0.3).toFixed(1) + " L" + (w * 0.3 + 6).toFixed(1) + " " + (h * 0.44).toFixed(1) + ' Z" fill="' +
      t.accent + '" opacity="0.92"/>';
    out += '<text x="' + (w * 0.36).toFixed(1) + '" y="' + (h * 0.33).toFixed(1) +
      '" font-family="monospace" font-weight="bold" font-size="' + (h * 0.09).toFixed(1) +
      '" fill="' + t.from + '" opacity="0.9">flag{...}</text>';
    for (var i = 0; i < 22; i++) {
      out += '<circle cx="' + (r() * w).toFixed(1) + '" cy="' + (h * (0.6 + r() * 0.4)).toFixed(1) + '" r="' +
        (1 + r() * 2).toFixed(1) + '" fill="#fff" opacity="' + (0.1 + r() * 0.3).toFixed(2) + '"/>';
    }
    return out;
  }

  var PATTERNS = {
    waves: patWaves, rain: patRain, hills: patHills, sky: patSky, sun: patSun,
    sakura: patSakura, bokeh: patBokeh, terminal: patTerminal, code: patCode,
    night: patNight, forest: patForest, desk: patDesk, puzzle: patPuzzle, flag: patFlag,
  };

  /**
   * 生成一张插画 SVG 字符串
   * @param {string} artName 主题名（见 THEMES）
   * @param {object} opt { w, h, seed, title }
   * @returns {string} svg 源码
   */
  function artSVG(artName, opt) {
    opt = opt || {};
    var w = opt.w || 800;
    var h = opt.h || 450;
    var t = theme(artName);
    var r = rng(opt.seed || artName);
    var idA = uid("ga");
    var idB = uid("gb");
    var patternFn = PATTERNS[t.pattern] || patHills;

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h +
      '" width="' + w + '" height="' + h + '" role="img" aria-label="' +
      escapeAttr(opt.title || artName) + '" preserveAspectRatio="xMidYMid slice">' +
      "<defs>" +
      '<linearGradient id="' + idA + '" x1="0" y1="0" x2="0.6" y2="1">' +
      '<stop offset="0%" stop-color="' + t.from + '"/>' +
      '<stop offset="100%" stop-color="' + t.to + '"/>' +
      "</linearGradient>" +
      '<radialGradient id="' + idB + '" cx="0.28" cy="0.18" r="0.85">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>' +
      '<stop offset="60%" stop-color="#ffffff" stop-opacity="0.04"/>' +
      '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + idA + ')"/>' +
      patternFn(r, w, h, t) +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + idB + ')"/>' +
      "</svg>"
    );
  }

  /** 把 SVG 转成 data URI，可以直接塞进 img[src]（避免 innerHTML 里嵌套 svg 的兼容问题） */
  function artDataURI(artName, opt) {
    var svg = artSVG(artName, opt);
    // encodeURIComponent 比 btoa 更安全（中文和 # 都不会出问题）
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /** 取封面图地址：优先用自定义图片，否则生成插画 */
  function coverSrc(cover, opt) {
    opt = opt || {};
    if (cover && cover.src) return cover.src;
    var art = (cover && cover.art) || "grass";
    return artDataURI(art, opt);
  }

  /** 生成封面 <img> 标签 HTML */
  function coverHTML(cover, opt) {
    opt = opt || {};
    var w = opt.w || 800, h = opt.h || 450;
    var src = coverSrc(cover, { w: w, h: h, seed: opt.seed });
    return '<img src="' + src + '" alt="' + escapeAttr(opt.alt || "文章封面") +
      '" loading="lazy" decoding="async" width="' + w + '" height="' + h + '">';
  }

  /* ==========================================================================
   * 三、头像生成
   * ======================================================================== */

  /** 用名字生成一个可爱的渐变头像（首字母 + 柔光），朋友没提供头像时用 */
  function avatarHTML(name, colorName, size) {
    var t = theme(colorName || "sakura");
    var ch = String(name || "?").trim().charAt(0).toUpperCase();
    var s = size || 52;
    return (
      '<span class="link-card__avatar" style="width:' + s + "px;height:" + s + "px;background:linear-gradient(150deg," +
      t.from + "," + t.to + ')" aria-hidden="true">' + escapeHTML(ch) + "</span>"
    );
  }

  /* ==========================================================================
   * 四、通用工具
   * ======================================================================== */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /** 转义 HTML，防止内容里的 < > 破坏结构（也顺便防了 XSS） */
  function escapeHTML(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  /** 属性值转义（比 escapeHTML 更严格一点） */
  function escapeAttr(str) { return escapeHTML(str).replace(/`/g, "&#96;"); }

  /** 格式化日期：2025-06-08 → 2025年6月8日；带 style 参数可换格式 */
  function formatDate(dateStr, style) {
    if (!dateStr) return "";
    var d = new Date(String(dateStr).replace(/-/g, "/"));
    if (isNaN(d.getTime())) return String(dateStr);
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    if (style === "iso") return dateStr;
    if (style === "short") return m + "月" + day + "日";
    if (style === "dot") return y + "." + pad(m) + "." + pad(day);
    return y + "年" + m + "月" + day + "日";
  }

  /** 相对时间：3 天前 */
  function timeAgo(dateStr) {
    var d = new Date(String(dateStr).replace(/-/g, "/"));
    if (isNaN(d.getTime())) return dateStr;
    var diff = Date.now() - d.getTime();
    var day = 86400000;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < day) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < day * 30) return Math.floor(diff / day) + " 天前";
    if (diff < day * 365) return Math.floor(diff / (day * 30)) + " 个月前";
    return Math.floor(diff / (day * 365)) + " 年前";
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /** 防抖：停止触发 delay 毫秒后才执行（用于搜索框输入） */
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay || 200);
    };
  }

  /** 节流：每 wait 毫秒最多执行一次（用于滚动监听） */
  function throttle(fn, wait) {
    var last = 0, timer = null;
    return function () {
      var args = arguments, ctx = this, now = Date.now();
      var remain = wait - (now - last);
      if (remain <= 0) {
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(ctx, args);
        }, remain);
      }
    };
  }

  /**
   * 统计正文字数：中文按字计，英文按词计
   *
   * 注意：技术博客里代码块会占很大比例。如果按平时「去掉代码」的算法，
   * 一篇满是代码的笔记会显示成「只有 200 字」，看起来很不合理。
   * 所以这里的算法是：
   *   · 代码块里的每一行算 8 个字（相当于「写了 8 行代码」的粗略折算）
   *   · 其余正文：中文按字、英文/数字按词
   * 这样统计出来的字数和「阅读时间」更贴近真实工作量。
   */
  function countWords(text) {
    if (!text) return 0;
    var str = String(text);

    /* --- 1. 先把代码块抽出来单独折算 --- */
    var codeLines = 0;
    str = str.replace(/```[\s\S]*?```/g, function (block) {
      codeLines += block.split("\n").length - 2; // 减去首尾的 ``` 两行
      return " ";
    });

    /* --- 2. 去掉行内代码、图片、链接语法，只留文字 --- */
    str = str
      .replace(/`[^`]*`/g, " ")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^\s*:::\s*\w*.*$/gm, " ")
      .replace(/[#*>\-|]/g, " ");

    var cn = (str.match(/[\u4e00-\u9fa5]/g) || []).length;   // 中文字符数
    var en = (str.match(/[A-Za-z0-9]+/g) || []).length;      // 英文单词 / 数字

    return cn + en + Math.max(0, codeLines) * 8;
  }

  /** 估算阅读时间（分钟）：中文约 380 字/分钟，英文约 200 词/分钟，取综合值 */
  function readTime(text) {
    var words = countWords(text);
    return Math.max(1, Math.round(words / 320));
  }

  /** 生成 URL 查询参数 */
  function getQuery(name, fallback) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search);
    if (!m) return fallback;
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")); }
    catch (e) { return fallback; }
  }

  /** 读取 localStorage（隐私模式下可能抛异常，所以要 try） */
  function store(key, value) {
    try {
      if (arguments.length === 1) {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return arguments.length === 1 ? null : false;
    }
  }

  return {
    THEMES: THEMES,
    THEME_NAMES: THEME_NAMES,
    artSVG: artSVG,
    artDataURI: artDataURI,
    coverSrc: coverSrc,
    coverHTML: coverHTML,
    avatarHTML: avatarHTML,
    $: $, $$: $$,
    escapeHTML: escapeHTML,
    escapeAttr: escapeAttr,
    formatDate: formatDate,
    timeAgo: timeAgo,
    debounce: debounce,
    throttle: throttle,
    countWords: countWords,
    readTime: readTime,
    getQuery: getQuery,
    store: store,
    rng: rng,
  };
})();
