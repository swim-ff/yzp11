/**
 * ============================================================================
 * 首页雨夜湖面特效 · assets/js/rain.js
 * ----------------------------------------------------------------------------
 * 用 Canvas 2D 实时绘制「墨绿色湖面 + 下雨 + 涟漪」，完全不依赖视频或 GIF。
 *
 * 画面分四层，从后到前：
 *   1. 水面底色      —— 径向渐变 + 地平线偏深的夜色
 *   2. 水面流动光纹  —— 随时间缓慢横向流动的柔光带（营造水波感）
 *   3. 雨丝          —— 带风偏移的下落线条，越靠近镜头越快越粗
 *   4. 涟漪          —— 雨滴入水时生成向外扩散的椭圆环，逐渐变淡消失
 *
 * 性能与体验：
 *   · 根据屏幕面积自动决定雨滴数量（手机少、电脑多）
 *   · devicePixelRatio 最高按 2 渲染，避免 4K 屏上浪费性能
 *   · 页面切到后台 / 元素不可见时自动暂停 requestAnimationFrame
 *   · 尊重系统的「减弱动态效果」偏好设置
 * ============================================================================
 */
window.RainFX = (function () {
  "use strict";

  /* ==========================================================================
   * 一、默认参数
   * ======================================================================== */
  var DEFAULTS = {
    intensity: 1,     // 雨量倍率
    ripple: 1,        // 涟漪密度倍率
    windX: -0.14,     // 水平风速（负数往左吹）
    showMist: true,   // 水面雾气
    ambient: true,    // 是否在水面上随机生成零散涟漪（像远处雨点落水）
    interactive: true,// 鼠标点击 / 触摸时在水面生成涟漪
  };

  /* 配色（和 CSS 里的墨绿湖水呼应） */
  var COLORS = {
    surfaceTop: "#0e3a2d",
    surfaceBottom: "#04120e",
    skyTop: "#02100c",
    skyGlow: "rgba(72, 168, 133, 0.20)",
    rain: "rgba(186, 236, 216, 0.5)",
    ripple: "rgba(178, 240, 214, 0.75)",
    mist: "rgba(140, 214, 186, 0.05)",
  };

  /* ==========================================================================
   * 二、工具
   * ======================================================================== */
  function rand(min, max) { return min + Math.random() * (max - min); }

  /** 是否开启了系统「减弱动态效果」 */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ==========================================================================
   * 三、主控制器
   * ======================================================================== */

  /**
   * 启动雨夜特效
   * @param {HTMLCanvasElement} canvas 画布元素
   * @param {object} options 见 DEFAULTS
   * @returns {object} 控制器 { start, stop, destroy, setOption }
   */
  function create(canvas, options) {
    if (!canvas || !canvas.getContext) return null;

    var opt = Object.assign({}, DEFAULTS, options || {});
    var ctx = canvas.getContext("2d", { alpha: false });

    /* ---------- 状态 ---------- */
    var W = 0, H = 0, dpr = 1;        // 逻辑尺寸与像素比
    var horizon = 0;                   // 水面起始高度
    var drops = [];                    // 雨滴
    var ripples = [];                  // 涟漪
    var running = false;
    var rafId = 0;
    var lastTime = 0;
    var time = 0;                      // 累计时间（秒）

    /* ========================================================================
     * 尺寸与初始化
     * ====================================================================== */
    function resize() {
      var rect = canvas.getBoundingClientRect();
      var cssW = Math.max(320, rect.width || window.innerWidth);
      var cssH = Math.max(360, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      W = cssW;
      H = cssH;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 水面从画面上方 12% 处开始，其余是「夜色天空」
      horizon = H * 0.12;
      buildDrops();
      buildAmbient();
    }

    /** 平均每帧需要维持的雨滴总数（按面积估算） */
    function targetDropCount() {
      var area = W * H;
      var base = Math.round(area / 9000);          // 面积越大雨越密
      return Math.max(70, Math.min(320, base)) * opt.intensity;
    }

    /** 创建一滴雨 */
    function makeDrop(fromTop) {
      var depth = Math.random();                    // 0 远 → 1 近（用于模拟景深）
      var speed = (520 + depth * 900) * (0.75 + opt.intensity * 0.25);
      return {
        x: rand(-60, W + 60),
        y: fromTop ? rand(-H * 0.6, -10) : rand(-40, H),
        // 越近的雨滴越长、越粗、越快
        len: 12 + depth * 40,
        width: 0.7 + depth * 1.6,
        speed: speed,
        alpha: 0.18 + depth * 0.5,
        depth: depth,
      };
    }

    function buildDrops() {
      var n = targetDropCount();
      drops = [];
      for (var i = 0; i < n; i++) drops.push(makeDrop(false));
    }

    /** 环境涟漪：水面随机冒出的圆圈，模拟远处的雨点 */
    var ambientTimer = 0;
    function buildAmbient() { ambientTimer = 0; }

    /** 创建一个涟漪 */
    function addRipple(x, y, strength) {
      // 涟漪用椭圆模拟透视：越靠下（近）越扁越大
      var perspective = (y - horizon) / Math.max(1, H - horizon); // 0 远 → 1 近
      ripples.push({
        x: x,
        y: y,
        r: 1.2,
        maxR: (16 + rand(6, 26)) * (0.5 + perspective) * (strength || 1),
        speed: (26 + rand(10, 30)) * (0.6 + perspective * 0.8),
        squash: 0.26 + perspective * 0.16,     // 椭圆压扁比例
        age: 0,
        life: 1.5 + rand(0.4, 1.1),
        strength: strength || 1,
        second: Math.random() < 0.45,          // 是否再补一圈内环（雨滴连续落水的感觉）
      });
      // 数量上限，避免长时间挂机后数组膨胀（涟漪多了会明显吃 GPU）
      if (ripples.length > 260) ripples.splice(0, ripples.length - 260);
    }

    /* ========================================================================
     * 绘制：四层画面
     * ====================================================================== */

    /** 第 1 层：天空与水面底色 */
    function drawBase() {
      // 天空（夜色，带一点远处城市的暖光）
      var sky = ctx.createLinearGradient(0, 0, 0, horizon * 3);
      sky.addColorStop(0, COLORS.skyTop);
      sky.addColorStop(0.55, "#062019");
      sky.addColorStop(1, COLORS.surfaceTop);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizon * 2);

      // 水面：径向渐变，中间稍亮（像远处有光源反射）
      var water = ctx.createRadialGradient(W * 0.5, horizon + (H - horizon) * 0.35, 10,
        W * 0.5, H * 0.75, Math.max(W, H) * 0.85);
      water.addColorStop(0, "#14503e");
      water.addColorStop(0.45, COLORS.surfaceTop);
      water.addColorStop(1, COLORS.surfaceBottom);
      ctx.fillStyle = water;
      ctx.fillRect(0, horizon, W, H - horizon);

      // 地平线处的一抹柔光（让天空与水面衔接自然）
      var glow = ctx.createLinearGradient(0, horizon - H * 0.12, 0, horizon + H * 0.14);
      glow.addColorStop(0, "rgba(0,0,0,0)");
      glow.addColorStop(0.5, COLORS.skyGlow);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizon - H * 0.12, W, H * 0.26);
    }

    /** 第 2 层：水面流动的光纹（用几条随时间移动的柔光带模拟水波） */
    function drawShimmer() {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (var i = 0; i < 7; i++) {
        var t = time * (0.06 + i * 0.012) + i * 1.7;
        // 光带在竖直方向缓慢漂移
        var y = horizon + (H - horizon) * ((i + 0.5) / 7) + Math.sin(t) * (H * 0.012);
        var thickness = (H - horizon) * 0.05 * (0.6 + (i % 3) * 0.35);
        var alpha = 0.028 + (i % 3) * 0.012;

        var g = ctx.createLinearGradient(0, y - thickness, 0, y + thickness);
        g.addColorStop(0, "rgba(120, 220, 186, 0)");
        g.addColorStop(0.5, "rgba(120, 220, 186, " + alpha.toFixed(3) + ")");
        g.addColorStop(1, "rgba(120, 220, 186, 0)");
        ctx.fillStyle = g;

        // 用二次曲线让光带边缘不规则（更像水面）
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (var x = 0; x <= W; x += W / 6) {
          var wobble = Math.sin(x * 0.004 + t * 2.1) * thickness * 0.5;
          ctx.quadraticCurveTo(x - W / 12, y + wobble - thickness * 0.3, x, y + wobble);
        }
        ctx.lineTo(W, y + thickness);
        ctx.lineTo(0, y + thickness);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /** 第 3 层：雨丝 */
    function drawDrops(dt) {
      ctx.save();
      ctx.lineCap = "round";
      var windPx = opt.windX * 260;    // 风的水平位移（像素/秒）

      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];

        // 位移：竖直速度为 speed，水平受风影响
        d.y += d.speed * dt;
        d.x += windPx * dt * (0.7 + d.depth * 0.6);

        // 画雨丝（一条带透明度的短线，方向与运动方向一致）
        var dx = windPx * (0.7 + d.depth * 0.6) / d.speed * d.len;
        var dy = d.len;
        ctx.strokeStyle = "rgba(186, 236, 216, " + d.alpha.toFixed(3) + ")";
        ctx.lineWidth = d.width;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + dx, d.y - dy);
        ctx.stroke();

        // 落水：在水面以下（或超出画面）时重生，并在水面上留一圈涟漪
        if (d.y > horizon + 6) {
          if (Math.random() < 0.34 * opt.ripple) {
            addRipple(d.x, d.y, 0.7 + d.depth * 0.6);
          }
        }
        if (d.y - dy > H + 30 || d.x < -120 || d.x > W + 120) {
          drops[i] = makeDrop(true);
        }
      }
      ctx.restore();
    }

    /** 第 4 层：涟漪 */
    function drawRipples(dt) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (var i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        rp.age += dt;
        rp.r += rp.speed * dt;

        var progress = rp.age / rp.life;
        if (progress >= 1 || rp.r > rp.maxR) {
          ripples.splice(i, 1);
          continue;
        }

        // 透明度：刚出现时淡入、之后线性淡出（扩散越远越模糊）
        var fade = progress < 0.15
          ? progress / 0.15
          : Math.pow(1 - (progress - 0.15) / 0.85, 1.7);
        var alpha = 0.6 * fade * rp.strength;

        // 主环：一个压扁的椭圆
        ctx.strokeStyle = "rgba(178, 240, 214, " + (alpha * 0.85).toFixed(3) + ")";
        ctx.lineWidth = Math.max(0.6, 2.1 * (1 - progress) + 0.4);
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * rp.squash, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 内环（更亮的细圈，只在涟漪前半程出现）
        if (rp.second && progress < 0.6) {
          ctx.strokeStyle = "rgba(220, 255, 240, " + (alpha * 0.45).toFixed(3) + ")";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r * 0.62, rp.r * rp.squash * 0.62, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    /** 水面雾气（最前面一层薄雾，让远处雨丝变柔） */
    function drawMist() {
      if (!opt.showMist) return;
      ctx.save();
      var g = ctx.createLinearGradient(0, horizon, 0, horizon + (H - horizon) * 0.45);
      g.addColorStop(0, COLORS.mist);
      g.addColorStop(1, "rgba(140, 214, 186, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, horizon, W, (H - horizon) * 0.45);
      ctx.restore();
    }

    /** 环境涟漪与降雨量维持 */
    function updateAmbient(dt) {
      if (!opt.ambient) return;
      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        ambientTimer = rand(0.05, 0.22) / Math.max(0.4, opt.ripple);
        // 在水面区域内随机位置生成
        var x = rand(0, W);
        var y = rand(horizon + 8, H - 4);
        addRipple(x, y, 0.55 + ((y - horizon) / (H - horizon)) * 0.7);
      }

      // 动态补充雨滴（参数被外部改动时也能跟上）
      var target = targetDropCount();
      if (drops.length < target) {
        for (var i = drops.length; i < target; i++) drops.push(makeDrop(true));
      } else if (drops.length > target + 20) {
        drops.length = target;
      }
    }

    /* ========================================================================
     * 主循环
     * ====================================================================== */
    function frame(now) {
      if (!running) return;
      if (!lastTime) lastTime = now;
      // dt 上限 50ms：切回标签页时不会因为时间跳跃导致雨滴瞬移
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      time += dt;

      drawBase();
      drawShimmer();
      updateAmbient(dt);
      drawDrops(dt);
      drawRipples(dt);
      drawMist();

      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    /* ========================================================================
     * 交互：点击水面生成涟漪
     * ====================================================================== */
    function onPointer(e) {
      if (!opt.interactive) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX != null ? e.clientX : 0) - rect.left;
      var y = (e.clientY != null ? e.clientY : 0) - rect.top;
      if (y < horizon) y = horizon + (H - horizon) * 0.3;

      // 一次点击生成三圈错开的涟漪，看起来像一颗大水珠砸进湖里
      addRipple(x, y, 1.7);
      setTimeout(function () { addRipple(x + rand(-12, 12), y + rand(-6, 6), 1.2); }, 90);
      setTimeout(function () { addRipple(x + rand(-20, 20), y + rand(-8, 8), 0.9); }, 190);
    }

    /* ========================================================================
     * 可见性处理
     * ====================================================================== */
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    var resizeHandler = null;
    var visibilityHandler = null;
    var pointerHandler = null;

    /* ---------- 初始化 ---------- */
    function init() {
      resize();
      start();

      var resizeTimer = null;
      resizeHandler = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 180);
      };
      window.addEventListener("resize", resizeHandler);

      visibilityHandler = onVisibility;
      document.addEventListener("visibilitychange", visibilityHandler);

      if (opt.interactive) {
        pointerHandler = onPointer;
        canvas.addEventListener("pointerdown", pointerHandler);
      }
    }

    /* 降低动效偏好：只画一帧静态画面，不做动画 */
    if (prefersReducedMotion()) {
      resize();
      drawBase();
      drawShimmer();
      // 静态画面也放几圈涟漪，保持氛围
      for (var s = 0; s < 14; s++) addRipple(rand(0, W), rand(horizon + 10, H - 6), 1);
      ripples.forEach(function (rp) { rp.age = rp.life * 0.35; rp.r = rp.maxR * 0.45; });
      drawRipples(0);
      drawMist();
      return {
        start: function () {}, stop: function () {}, destroy: function () {},
        setOption: function () {},
      };
    }

    init();

    return {
      start: start,
      stop: stop,
      /** 运行中修改参数（例如夜间模式降低雨量） */
      setOption: function (key, value) { opt[key] = value; },
      destroy: function () {
        stop();
        if (resizeHandler) window.removeEventListener("resize", resizeHandler);
        if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
        if (pointerHandler) canvas.removeEventListener("pointerdown", pointerHandler);
        drops = [];
        ripples = [];
      },
    };
  }

  return { create: create, DEFAULTS: DEFAULTS };
})();
