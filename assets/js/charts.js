/**
 * ============================================================================
 * 手写 SVG 图表 · assets/js/charts.js
 * ----------------------------------------------------------------------------
 * 不引入 Chart.js / ECharts，用 SVG 手绘三种图表：
 *   barChart()   —— 柱状图（分类文章数量、标签使用次数）
 *   areaChart()  —— 面积折线图（文章发布时间趋势）
 *   donutChart() —— 环形图（文章分类占比）
 *
 * 为什么手写？
 *   1. 体积小：整个文件不到 300 行，零依赖，离线可用
 *   2. 样式统一：颜色直接取 CSS 变量，和全站风格一致
 *   3. 能学东西：坐标换算、比例尺、SVG path 都是很实用的技能
 *
 * 用法：
 *   document.querySelector("#chart").innerHTML = Charts.barChart(data, { title: "分类" });
 *   Charts.bindTips(container)   // 绑定悬停提示（柱状图/折线图都需要）
 * ============================================================================
 */
window.Charts = (function () {
  "use strict";

  /* 图表配色（和内页背景、湖面配色呼应） */
  var PALETTE = ["#2f8f6f", "#63b894", "#7fb069", "#6fb3d9", "#ef8fae", "#ffd479", "#cdbcf0", "#4d8a3c"];

  var NS = "http://www.w3.org/2000/svg";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** 生成一个好看的圆角矩形柱子路径（顶部圆角，底部贴轴线） */
  function barPath(x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h);
    return "M" + x + " " + (y + h) +
      " L" + x + " " + (y + radius) +
      " Q" + x + " " + y + " " + (x + radius) + " " + y +
      " L" + (x + w - radius) + " " + y +
      " Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + radius) +
      " L" + (x + w) + " " + (y + h) + " Z";
  }

  /** 把一组数映射到像素高度 */
  function scale(value, max, height) {
    if (max <= 0) return 0;
    return Math.max(2, (value / max) * height); // 至少 2px，保证有数值的柱子能看见
  }

  /* ==========================================================================
   * 一、柱状图
   * @param {Array} data [{ name, count }]
   * @param {object} opt { height, gap, valueSuffix, colorFrom, rotateLabel }
   * ======================================================================== */
  function barChart(data, opt) {
    opt = opt || {};
    data = (data || []).filter(function (d) { return d && d.name; });
    if (!data.length) return emptySVG("暂无数据");

    var W = opt.width || 640;
    var H = opt.height || 280;
    var padding = { top: 22, right: 16, bottom: 52, left: 42 };
    var innerW = W - padding.left - padding.right;
    var innerH = H - padding.top - padding.bottom;

    var max = Math.max.apply(null, data.map(function (d) { return d.count; }).concat([1]));
    // Y 轴刻度取整（1/2/5 × 10^n 风格）
    var step = niceStep(max);
    var top = Math.ceil(max / step) * step;

    var slot = innerW / data.length;
    var barW = Math.min(opt.maxBarWidth || 46, slot * 0.6);
    var svg = [];

    /* --- 网格线与 Y 轴刻度 --- */
    for (var v = 0; v <= top; v += step) {
      var y = padding.top + innerH - (v / top) * innerH;
      svg.push('<line x1="' + padding.left + '" y1="' + y + '" x2="' + (W - padding.right) +
        '" y2="' + y + '" stroke="rgba(29,58,51,.12)" stroke-dasharray="' + (v === 0 ? "0" : "4 5") + '"/>');
      svg.push('<text x="' + (padding.left - 9) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#8ba39d">' +
        v + "</text>");
    }

    /* --- 柱子 --- */
    data.forEach(function (d, idx) {
      var h = scale(d.count, top, innerH);
      var x = padding.left + slot * idx + (slot - barW) / 2;
      var y = padding.top + innerH - h;
      var color = opt.colorFrom === "index" ? PALETTE[idx % PALETTE.length] : (opt.color || "url(#barGrad)");

      svg.push(
        '<g class="chart-bar" data-name="' + esc(d.name) + '" data-value="' + d.count + '">' +
          // 透明热区，鼠标放上去更容易触发（柱子太细时特别有用）
          '<rect x="' + (x - (slot - barW) / 2) + '" y="' + padding.top + '" width="' + slot +
            '" height="' + innerH + '" fill="transparent"/>' +
          '<path d="' + barPath(x, y, barW, h, 8) + '" fill="' + color + '" class="chart-bar__shape"/>' +
          // 数值直接标在柱子顶上
          '<text x="' + (x + barW / 2) + '" y="' + (y - 7) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#3d5a53">' +
            d.count + "</text>" +
        "</g>"
      );
    });

    /* --- X 轴标签 --- */
    data.forEach(function (d, idx) {
      var cx = padding.left + slot * idx + slot / 2;
      var label = d.name.length > 6 ? d.name.slice(0, 6) + "…" : d.name;
      if (opt.rotateLabel) {
        svg.push('<text x="' + cx + '" y="' + (padding.top + innerH + 16) + '" text-anchor="end" font-size="11" fill="#63807a" transform="rotate(-32 ' +
          cx + " " + (padding.top + innerH + 16) + ')">' + esc(label) + "</text>");
      } else {
        svg.push('<text x="' + cx + '" y="' + (padding.top + innerH + 19) + '" text-anchor="middle" font-size="11.5" fill="#63807a">' +
          esc(label) + "</text>");
      }
    });

    return wrapSVG(W, H, defs() + svg.join(""));
  }

  /* ==========================================================================
   * 二、面积折线图（发布时间趋势）
   * @param {Array} data [{ label, count, words }]
   * ======================================================================== */
  function areaChart(data, opt) {
    opt = opt || {};
    data = (data || []).filter(Boolean);
    if (!data.length) return emptySVG("暂无数据");

    var W = opt.width || 680;
    var H = opt.height || 300;
    var padding = { top: 26, right: 20, bottom: 46, left: 42 };
    var innerW = W - padding.left - padding.right;
    var innerH = H - padding.top - padding.bottom;

    var max = Math.max.apply(null, data.map(function (d) { return d.count; }).concat([1]));
    var step = niceStep(max);
    var top = Math.ceil(max / step) * step;

    var n = data.length;
    // 只有一个月时让它居中
    function px(idx) {
      if (n === 1) return padding.left + innerW / 2;
      return padding.left + (idx / (n - 1)) * innerW;
    }
    function py(val) {
      return padding.top + innerH - (val / top) * innerH;
    }

    var svg = [];

    /* --- 网格 --- */
    for (var v = 0; v <= top; v += step) {
      var y = py(v);
      svg.push('<line x1="' + padding.left + '" y1="' + y + '" x2="' + (W - padding.right) + '" y2="' + y +
        '" stroke="rgba(29,58,51,.12)" stroke-dasharray="' + (v === 0 ? "0" : "4 5") + '"/>');
      svg.push('<text x="' + (padding.left - 9) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#8ba39d">' + v + "</text>");
    }

    /* --- 路径 --- */
    var linePts = data.map(function (d, idx) { return px(idx) + "," + py(d.count); });
    var lineD = "M" + linePts.join(" L");
    var areaD = lineD + " L" + px(n - 1) + "," + py(0) + " L" + px(0) + "," + py(0) + " Z";

    svg.push('<path d="' + areaD + '" fill="url(#areaGrad)"/>');
    svg.push('<path d="' + lineD + '" fill="none" stroke="#2f8f6f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>');

    /* --- 数据点 + 热区 --- */
    data.forEach(function (d, idx) {
      svg.push(
        '<g class="chart-point" data-name="' + esc(d.label) + '" data-value="' + d.count + '">' +
          '<circle cx="' + px(idx) + '" cy="' + py(d.count) + '" r="11" fill="transparent"/>' +
          '<circle cx="' + px(idx) + '" cy="' + py(d.count) + '" r="4.4" fill="#fff" stroke="#2f8f6f" stroke-width="2.6" class="chart-point__dot"/>' +
        "</g>"
      );
    });

    /* --- X 轴标签（太多就隔一个显示） --- */
    var skip = Math.ceil(n / 12);
    data.forEach(function (d, idx) {
      if (idx % skip !== 0 && idx !== n - 1) return;
      svg.push('<text x="' + px(idx) + '" y="' + (padding.top + innerH + 20) +
        '" text-anchor="middle" font-size="10.5" fill="#63807a">' + esc(shortLabel(d.label)) + "</text>");
    });

    return wrapSVG(W, H, defs() + svg.join(""));
  }

  /* ==========================================================================
   * 三、环形图（分类占比）
   * @param {Array} data [{ name, count }]
   * ======================================================================== */
  function donutChart(data, opt) {
    opt = opt || {};
    data = (data || []).filter(Boolean);
    if (!data.length) return emptySVG("暂无数据");

    var W = opt.width || 320;
    var H = opt.height || 300;
    var cx = W / 2;
    var cy = H / 2 - 8;
    var R = Math.min(W, H) / 2 - 22;
    var r = R * 0.62;                 // 内半径，决定环的粗细
    var total = data.reduce(function (s, d) { return s + d.count; }, 0) || 1;

    var svg = [];
    var angle = -Math.PI / 2;         // 从 12 点方向开始顺时针画

    data.forEach(function (d, idx) {
      var ratio = d.count / total;
      var delta = ratio * Math.PI * 2;
      var start = angle;
      var end = angle + delta;
      angle = end;

      var x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      var x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
      var x3 = cx + r * Math.cos(end), y3 = cy + r * Math.sin(end);
      var x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start);
      var largeArc = delta > Math.PI ? 1 : 0;
      var color = PALETTE[idx % PALETTE.length];

      // 只有一项时画完整圆环（path 的 arc 无法闭合整圆）
      var dPath = data.length === 1
        ? "M" + cx + " " + (cy - R) + " A" + R + " " + R + " 0 1 1 " + (cx - 0.01) + " " + (cy - R) +
          " L" + (cx - 0.01) + " " + (cy - r) + " A" + r + " " + r + " 0 1 0 " + cx + " " + (cy - r) + " Z"
        : "M" + x1.toFixed(2) + " " + y1.toFixed(2) +
          " A" + R + " " + R + " 0 " + largeArc + " 1 " + x2.toFixed(2) + " " + y2.toFixed(2) +
          " L" + x3.toFixed(2) + " " + y3.toFixed(2) +
          " A" + r + " " + r + " 0 " + largeArc + " 0 " + x4.toFixed(2) + " " + y4.toFixed(2) + " Z";

      svg.push('<path class="chart-slice" d="' + dPath + '" fill="' + color + '" data-name="' + esc(d.name) +
        '" data-value="' + d.count + '" data-ratio="' + Math.round(ratio * 100) + '"/>');
    });

    // 中间文字
    svg.push('<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="26" font-weight="800" fill="#10493a">' +
      total + "</text>");
    svg.push('<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="11.5" fill="#8ba39d">篇文章</text>');

    // 图例
    var legendY = H - 12 - Math.ceil(data.length / 2) * 16;
    data.forEach(function (d, idx) {
      var col = idx % 2;
      var row = Math.floor(idx / 2);
      var lx = 16 + col * (W / 2 - 8);
      var ly = legendY + row * 16 + 10;
      svg.push('<rect x="' + lx + '" y="' + (ly - 7) + '" width="9" height="9" rx="2.5" fill="' + PALETTE[idx % PALETTE.length] + '"/>');
      svg.push('<text x="' + (lx + 14) + '" y="' + ly + '" font-size="11" fill="#63807a">' +
        esc(d.name.length > 7 ? d.name.slice(0, 7) + "…" : d.name) + " " + d.count + "</text>");
    });

    return wrapSVG(W, H, defs() + svg.join(""));
  }

  /* ==========================================================================
   * 四、辅助函数
   * ======================================================================== */
  function defs() {
    return (
      "<defs>" +
        '<linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">' +
          '<stop offset="0%" stop-color="#63b894"/>' +
          '<stop offset="100%" stop-color="#2f8f6f"/>' +
        "</linearGradient>" +
        '<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#63b894" stop-opacity="0.42"/>' +
          '<stop offset="100%" stop-color="#63b894" stop-opacity="0.02"/>' +
        "</linearGradient>" +
      "</defs>"
    );
  }

  function wrapSVG(w, h, inner) {
    return '<svg class="chart-svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h +
      '" preserveAspectRatio="xMidYMid meet" role="img">' + inner + "</svg>";
  }

  function emptySVG(text) {
    return '<div class="empty" style="padding:34px 16px"><span class="empty__emoji">📉</span>' +
      esc(text || "暂无数据") + "</div>";
  }

  /** 计算「好看」的刻度步长：1 2 5 10 20 50 ... */
  function niceStep(max) {
    if (max <= 5) return 1;
    var raw = max / 5;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return mult * mag;
  }

  function shortLabel(label) {
    // "2025-06" → "25/06"
    var m = /^(\d{4})-(\d{2})$/.exec(label || "");
    if (m) return m[1].slice(2) + "/" + m[2];
    return label;
  }

  /* ==========================================================================
   * 五、悬停提示
   * 用法：Charts.bindTips(document.querySelector("#chartWrap"))
   * ======================================================================== */
  function bindTips(container) {
    if (!container) return;
    var tip = container.querySelector(".chart-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tip";
      container.appendChild(tip);
    }

    container.addEventListener("mouseover", function (e) {
      var g = e.target.closest(".chart-bar, .chart-point, .chart-slice");
      if (!g || !container.contains(g)) return;
      var name = g.getAttribute("data-name");
      var value = g.getAttribute("data-value");
      var ratio = g.getAttribute("data-ratio");
      tip.textContent = name + " · " + value + (ratio ? " 篇（" + ratio + "%）" : " 篇");

      var rect = container.getBoundingClientRect();
      var target = g.getBoundingClientRect();
      tip.style.left = (target.left - rect.left + target.width / 2) + "px";
      tip.style.top = (target.top - rect.top) + "px";
      tip.classList.add("is-on");

      var shape = g.querySelector(".chart-bar__shape, .chart-point__dot, path");
      if (shape) shape.style.filter = "brightness(1.12)";
    });

    container.addEventListener("mouseout", function (e) {
      var g = e.target.closest(".chart-bar, .chart-point, .chart-slice");
      if (g) {
        var shape = g.querySelector(".chart-bar__shape, .chart-point__dot, path");
        if (shape) shape.style.filter = "";
      }
      tip.classList.remove("is-on");
    });
  }

  return {
    barChart: barChart,
    areaChart: areaChart,
    donutChart: donutChart,
    bindTips: bindTips,
    PALETTE: PALETTE,
  };
})();
