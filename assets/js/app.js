/**
 * ============================================================================
 * 应用外壳与共享组件 · assets/js/app.js
 * ----------------------------------------------------------------------------
 * 每个页面都会加载这个文件，它负责：
 *   1. 渲染顶部导航栏和页脚（HTML 里只留一个占位 div，避免重复代码）
 *   2. 页面滚动相关交互：导航栏变色、阅读进度条、返回顶部按钮
 *   3. 卡片进入视口时的淡入上浮动画（IntersectionObserver）
 *   4. 共享的 HTML 片段生成：博文卡片、分节标题、空状态、灯箱
 *   5. 代码块「复制」按钮
 *
 * 页面上通过 window.App 调用这些能力。
 * ============================================================================
 */
window.App = (function () {
  "use strict";

  var SITE = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ==========================================================================
   * 一、站点 Logo（内联 SVG 小房子，鼠标悬停会轻轻摆动）
   * ======================================================================== */
  var LOGO_SVG =
    '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
      '<path d="M3 15.5 16 5l13 10.5" stroke="#2f8f6f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M6.5 14.5V26a1.5 1.5 0 0 0 1.5 1.5h16a1.5 1.5 0 0 0 1.5-1.5V14.5" ' +
        'stroke="#10493a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M13 27.5v-6.2a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2v6.2" ' +
        'fill="#a8cf8e" stroke="#10493a" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M22 9.5c1.8-2.4 4.6-2.2 5.6-.6" stroke="#63b894" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  /* ==========================================================================
   * 二、导航栏
   * ======================================================================== */
  /** 当前页面文件名，用于高亮导航（index.html 视为 home） */
  function currentPage() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    return path || "index.html";
  }

  function renderNav() {
    var host = $("#siteNav");
    if (!host) return;
    var page = currentPage();
    var items = (SITE.nav || []).map(function (item) {
      var isActive = item.href === page;
      return '<li><a class="nav-link' + (isActive ? " is-active" : "") + '" href="' + item.href +
        '"' + (isActive ? ' aria-current="page"' : "") + ">" +
        '<span aria-hidden="true">' + (item.icon || "") + "</span>" +
        "<span>" + item.label + "</span></a></li>";
    }).join("");

    host.className = "site-nav";
    host.innerHTML =
      '<div class="nav-inner">' +
        '<a class="nav-brand" href="index.html" aria-label="' + (SITE.name || "首页") + ' 首页">' +
          LOGO_SVG + "<span>" + (SITE.name || "我的小窝") + "</span>" +
        "</a>" +
        '<ul class="nav-links">' + items + "</ul>" +
        '<button class="nav-toggle" type="button" aria-label="打开菜单" aria-expanded="false">' +
          "<span></span><span></span><span></span>" +
        "</button>" +
      "</div>" +
      '<nav class="nav-drawer" aria-label="移动端导航"><ul>' + items + "</ul></nav>";

    /* --- 汉堡菜单开关 --- */
    var toggle = $(".nav-toggle", host);
    var drawer = $(".nav-drawer", host);
    if (toggle && drawer) {
      toggle.addEventListener("click", function () {
        var open = drawer.classList.toggle("is-open");
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      // 点击抽屉里的链接后自动收起
      $$("a", drawer).forEach(function (a) {
        a.addEventListener("click", function () {
          drawer.classList.remove("is-open");
          toggle.classList.remove("is-open");
        });
      });
    }
  }

  /* ==========================================================================
   * 三、页脚
   * ======================================================================== */
  function renderFooter() {
    var host = $("#siteFooter");
    if (!host) return;
    var y = new Date().getFullYear();
    var since = SITE.since || y;
    var copyright = since === y ? "© " + y : "© " + since + " - " + y;

    var links = (SITE.footer && SITE.footer.links || []).map(function (l) {
      var ext = /^https?:/i.test(l.href) ? ' target="_blank" rel="noopener"' : "";
      return '<li><a href="' + l.href + '"' + ext + ">" + l.label + "</a></li>";
    }).join("");

    var socials = ((SITE.profile && SITE.profile.socials) || []).map(function (s) {
      var ext = /^https?:/i.test(s.href) ? ' target="_blank" rel="noopener"' : "";
      return '<li><a href="' + s.href + '"' + ext + '><span aria-hidden="true">' + (s.icon || "🔗") +
        "</span> " + s.label + "</a></li>";
    }).join("") +
      /* 后台入口：放页脚里，不占导航栏位置（前台导航保持你原来的九项） */
      '<li><a href="admin.html"><span aria-hidden="true">🖋️</span> 写作后台</a></li>';

    host.className = "site-footer";
    host.innerHTML =
      '<div class="container">' +
        '<div class="footer-inner">' +
          "<div>" +
            '<div style="font-weight:700;color:#eafff6;margin-bottom:6px">' + LOGO_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" style="width:18px;height:18px;vertical-align:-3px;margin-right:6px"') +
              (SITE.name || "我的小窝") + "</div>" +
            '<div style="font-size:12.6px;color:rgba(214,240,232,.62)">' + (SITE.slogan || "") + "</div>" +
          "</div>" +
          '<nav aria-label="页脚导航"><ul class="footer-links">' + links + "</ul></nav>" +
          '<nav aria-label="社交链接"><ul class="footer-links">' + socials + "</ul></nav>" +
        "</div>" +
        '<p class="footer-note">' + copyright + " · " + (SITE.name || "我的小窝") + " · " +
          (SITE.footer && SITE.footer.note || "") +
          (SITE.icp ? ' · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style="color:inherit">' + SITE.icp + "</a>" : "") +
        "</p>" +
      "</div>";
  }

  /* ==========================================================================
   * 四、滚动交互
   * ======================================================================== */
  function initScroll() {
    var nav = $("#siteNav");
    var bar = $("#progressBar");
    var topBtn = $("#toTop");

    if (!topBtn) {
      topBtn = document.createElement("button");
      topBtn.id = "toTop";
      topBtn.className = "to-top";
      topBtn.type = "button";
      topBtn.setAttribute("aria-label", "返回顶部");
      topBtn.innerHTML = "↑";
      document.body.appendChild(topBtn);
    }
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop;

      // 导航栏：滚动 40px 后加深背景
      if (nav) nav.classList.toggle("is-stuck", y > 40);
      // 返回顶部按钮
      topBtn.classList.toggle("is-on", y > 520);
      // 阅读进度条
      if (bar) {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        var percent = docH > 0 ? Math.min(100, (y / docH) * 100) : 0;
        bar.style.width = percent.toFixed(2) + "%";
      }
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ==========================================================================
   * 五、卡片淡入动画
   * ======================================================================== */
  function observeReveal(root) {
    var nodes = $$(".reveal:not(.is-in)", root || document);
    if (!nodes.length) return;

    // 不支持 IntersectionObserver 的老浏览器：直接显示
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    nodes.forEach(function (n, idx) {
      // 依次延迟一点点，形成错落的入场效果
      n.style.transitionDelay = Math.min(idx % 8, 6) * 60 + "ms";
      io.observe(n);
    });
  }

  /* ==========================================================================
   * 六、共享 HTML 组件
   * ======================================================================== */

  /**
   * 博文卡片
   * @param {object} post CONTENT 里的文章对象
   * @param {object} opt { compact: true 时不显示简介 }
   */
  function postCard(post, opt) {
    opt = opt || {};
    var cover = window.UI.coverSrc(post.cover, { w: 800, h: 450, seed: post.slug });
    var tags = post.tags.slice(0, 3).map(function (t) {
      return '<span class="chip"># ' + window.UI.escapeHTML(t) + "</span>";
    }).join("");

    return (
      '<a class="post-card glass lift reveal" href="post.html?p=' + encodeURIComponent(post.slug) + '">' +
        '<div class="post-card__cover">' +
          '<span class="post-card__cat">' + window.UI.escapeHTML(post.category) + "</span>" +
          '<img src="' + cover + '" alt="' + window.UI.escapeAttr(post.title) + ' 封面" loading="lazy" decoding="async">' +
        "</div>" +
        '<div class="post-card__body">' +
          '<h3 class="post-card__title">' + window.UI.escapeHTML(post.title) + "</h3>" +
          (opt.compact ? "" : '<p class="post-card__excerpt">' + window.UI.escapeHTML(post.excerpt) + "</p>") +
          (tags ? '<div class="post-card__tags">' + tags + "</div>" : "") +
          '<div class="post-card__meta">' +
            "<span>🗓 " + window.UI.formatDate(post.date) + "</span>" +
            "<span>⏱ " + post.readTime + " 分钟</span>" +
            "<span>✍️ " + post.words + " 字</span>" +
            '<span class="spacer"></span>' +
            '<span style="color:var(--c-lake-400);font-weight:600">阅读 →</span>' +
          "</div>" +
        "</div>" +
      "</a>"
    );
  }

  /** 分节标题 */
  function sectionTitle(title, moreHref, moreLabel) {
    return (
      '<div class="section__head">' +
        '<h2 class="section__title">' + title + "</h2>" +
        (moreHref ? '<a class="section__more" href="' + moreHref + '">' + (moreLabel || "查看全部") + " →</a>" : "") +
      "</div>"
    );
  }

  /** 空状态 */
  function emptyState(emoji, text) {
    return '<div class="empty"><span class="empty__emoji">' + (emoji || "🍃") + "</span>" +
      window.UI.escapeHTML(text || "这里还什么都没有～") + "</div>";
  }

  /** 页面头部卡片 */
  function pageHead(opt) {
    var stats = (opt.stats || []).map(function (s) {
      return '<span class="chip ' + (s.cls || "") + '">' + s.text + "</span>";
    }).join("");
    return (
      '<header class="page-head glass reveal">' +
        '<h1 class="page-head__title"><span class="emoji" aria-hidden="true">' + (opt.emoji || "🌸") + "</span>" +
          window.UI.escapeHTML(opt.title || "") + "</h1>" +
        (opt.desc ? '<p class="page-head__desc">' + opt.desc + "</p>" : "") +
        (stats ? '<div class="page-head__stats">' + stats + "</div>" : "") +
      "</header>"
    );
  }

  /* ==========================================================================
   * 七、代码块复制按钮 + 图片灯箱
   * ======================================================================== */
  function initCopyButtons(root) {
    var nodes = $$(".md-copy", root || document);
    nodes.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("data-target"));
        if (!target) return;
        var text = target.innerText;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = "已复制 ✓";
          btn.classList.add("is-done");
          setTimeout(function () {
            btn.textContent = old === "已复制 ✓" ? "复制" : old;
            btn.classList.remove("is-done");
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else {
          fallback();
        }
        function fallback() {
          // 兼容 file:// 或旧浏览器：用临时 textarea
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); done(); } catch (e) { /* 忽略 */ }
          document.body.removeChild(ta);
        }
      });
    });
  }

  /** 简单灯箱：点击 .gallery__item 等元素放大查看 */
  function initLightbox(root) {
    var box = $("#lightbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "lightbox";
      box.className = "lightbox";
      box.innerHTML =
        '<button class="lightbox__close" type="button" aria-label="关闭">✕</button>' +
        '<img class="lightbox__img" alt="">' +
        '<p class="lightbox__cap"></p>';
      document.body.appendChild(box);

      box.addEventListener("click", function (e) {
        if (e.target === box || e.target.classList.contains("lightbox__close")) close();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    }
    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    function open(src, caption) {
      var img = $(".lightbox__img", box);
      img.src = src;
      $(".lightbox__cap", box).textContent = caption || "";
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    $$("[data-zoom]", root || document).forEach(function (el) {
      if (el.dataset.zoomBound) return;
      el.dataset.zoomBound = "1";
      el.addEventListener("click", function () {
        var img = $("img", el);
        open(img ? img.src : el.getAttribute("data-zoom"), el.getAttribute("data-caption") || "");
      });
    });
    return { open: open, close: close };
  }

  /* ==========================================================================
   * 八、初始化
   *    boot() 可以被重复调用：main.js 从数据库取回网站设置后，
   *    会再调一次，用新设置把导航和页脚重画一遍。
   * ======================================================================== */
  function boot() {
    renderNav();
    renderFooter();
    initScroll();
    initCopyButtons();
    observeReveal();

    /* 更新 <meta name="description">，方便搜索引擎和分享卡片 */
    if (SITE.description) {
      var meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      if (!meta.content) meta.content = SITE.description;
    }
  }

  if (document.readyState === "loading" && !window.__NEST_DEFER_APP_BOOT) {
    document.addEventListener("DOMContentLoaded", boot);
  } else if (!window.__NEST_DEFER_APP_BOOT) {
    boot();
  }
  /* 如果设置了 window.__NEST_DEFER_APP_BOOT = true，
     说明 main.js 会先等数据库把网站设置取回来，再由它调用 App.boot()。
     这样可以避免「先用旧名字画一遍导航、再重画一次」的闪动。 */

  return {
    boot: boot,
    postCard: postCard,
    sectionTitle: sectionTitle,
    emptyState: emptyState,
    pageHead: pageHead,
    observeReveal: observeReveal,
    initCopyButtons: initCopyButtons,
    initLightbox: initLightbox,
    $: $,
    $$: $$,
    LOGO_SVG: LOGO_SVG,
  };
})();
