/**
 * ============================================================================
 *  页面入口 · assets/js/main.js
 * ----------------------------------------------------------------------------
 *  每个页面都加载这个文件。它做三件事：
 *
 *    1. 先从数据库把「网站设置」取回来（站名、导航、首页文案、个人信息…）
 *       覆盖掉 content/site.js 里的默认值 —— 这样你在后台改设置，前台立刻变
 *    2. 等 CONTENT.ready（文章、随笔、相册等数据都取回来了）
 *    3. 根据 <body data-page="xxx"> 执行对应页面的渲染逻辑
 *
 *  页面模块一览：
 *    home       首页      —— 雨夜 Canvas、个人信息卡、最新博文、标签云
 *    posts      博文列表  —— 搜索、分类/标签筛选、排序、分页
 *    post       博文详情  —— markdown 渲染、目录、浏览计数、评论、上下篇
 *    stats      统计      —— 数据面板 + 柱状图 + 趋势图 + 环形图
 *    essays     随笔      —— 时间线 + 点赞
 *    gallery    相册      —— 瀑布流 + 灯箱
 *    friends    友链      —— 友链卡片
 *    log        日志      —— 时间线 + 类型筛选
 *    guestbook  留言板    —— 留言表单（存数据库）
 *    about      关于我    —— 技能条、时间线、联系方式
 *
 *  【小白提示】你不需要看懂这个文件。想发文章请打开后台 /admin.html。
 * ============================================================================
 */
(function () {
  "use strict";

  /* ==========================================================================
   * 0. 快捷工具
   * ======================================================================== */
  var U = window.UI;
  var A = window.App;
  var C = window.CONTENT;
  var esc = function (s) { return U.escapeHTML(s); };

  /* ==========================================================================
   * 0.1 空状态 / 出错提示
   *     —— 数据库没配好、或者一条内容都没有时，都会走到这里，
   *        给站长（也就是你）一句能照着做的人话提示。
   * ======================================================================== */

  /** 判断当前该显示哪种空状态 */
  function emptyFor(kind, hint) {
    var st = C.state || {};

    /* ① 还没填 content/config.js */
    if (!st.configured) {
      return A.emptyState(
        "🔌",
        "网站还没有连接数据库。请打开 content/config.js，把 Supabase 的网址和密钥填进去" +
        "（详细步骤看跟网站放在一起的《新手操作手册.md》）。"
      );
    }

    /* ② 连上了但读数据出错 */
    if (!st.ok) {
      return A.emptyState("⚠️", st.message || "读取数据库失败，请稍后刷新重试。");
    }

    /* ③ 一切正常，只是还没有内容 */
    return A.emptyState(kind, hint || "还没有内容。登录后台 /admin.html 发第一条吧～");
  }

  /**
   * 「数据库没连上，所以不能留言/评论」的大提示块
   * 直接把原因和解决办法写在页面上，省得你去翻文档
   */
  function dbNotReadyHTML(what) {
    var st = C.state || {};
    var reason = st.message || "数据库还没连接。";
    var steps = !st.configured
      ? "<ol style=\"margin:10px 0 0;padding-left:1.3em\">" +
          "<li>打开网站文件夹里的 <code>content/config.js</code></li>" +
          "<li>按里面的说明，把 Supabase 的 <b>Project URL</b> 和 <b>anon key</b> 填进去</li>" +
          "<li>保存文件，然后刷新这个页面</li>" +
        "</ol>" +
        "<p style=\"margin:12px 0 0\">完整步骤见跟网站放在一起的《新手操作手册.md》。</p>"
      : "<p style=\"margin:10px 0 0\">常见原因和解决办法：</p>" +
        "<ol style=\"margin:6px 0 0;padding-left:1.3em\">" +
          "<li>还没有在 Supabase 的 SQL Editor 里执行 <code>supabase/schema.sql</code>（会提示找不到表）</li>" +
          "<li>网络连不上 Supabase，或者 <code>config.js</code> 里的网址填错了</li>" +
          "<li>加载 Supabase 库失败（可把库文件放到 <code>assets/lib/supabase.js</code>，见手册「离线用法」）</li>" +
        "</ol>" +
        "<p style=\"margin:12px 0 0\">按 <b>F12</b> 打开控制台，红色的那行就是具体错误。</p>";

    return '<div class="glass" style="padding:22px 24px;border-radius:var(--r-lg)">' +
      '<p style="margin:0;font-weight:700;color:#c2506f">' + (what || "💬 暂时用不了") + "</p>" +
      '<p style="margin:8px 0 0">原因：' + esc(reason) + "</p>" +
      steps +
    "</div>";
  }

  /* ==========================================================================
   * 1. 首页
   * ======================================================================== */
  var Home = {
    init: function () {
      var site = window.SITE || {};
      var hero = site.hero || {};

      this.renderHeroText(hero);
      this.renderProfile();
      this.startRain(hero.rain || {});
      this.renderLatest();
      this.renderTagCloud();
      this.renderExplore();
    },

    /* ---------- 1.1 首屏文字 ---------- */
    renderHeroText: function (hero) {
      var titleEl = document.getElementById("heroTitle");
      if (titleEl && hero.title) {
        /* 逐字拆开，做错开的浮动动画 */
        titleEl.innerHTML = hero.title.split("").map(function (ch, i) {
          return '<span class="char" style="animation-delay:' + (i * 0.16).toFixed(2) + 's">' +
            (ch === " " ? "&nbsp;" : esc(ch)) + "</span>";
        }).join("");
      }
      var eyebrow = document.getElementById("heroEyebrow");
      if (eyebrow && hero.eyebrow) eyebrow.textContent = hero.eyebrow;
      var sub = document.getElementById("heroSubtitle");
      if (sub) sub.textContent = hero.subtitle || "";

      var actions = document.getElementById("heroActions");
      if (actions) {
        var html = "";
        if (hero.primaryBtn) {
          html += '<a class="btn btn--primary" href="' + hero.primaryBtn.href + '">' +
            esc(hero.primaryBtn.label) + "</a>";
        }
        if (hero.secondaryBtn) {
          html += '<a class="btn btn--ghost-dark" href="' + hero.secondaryBtn.href + '">' +
            esc(hero.secondaryBtn.label) + "</a>";
        }
        actions.innerHTML = html;
      }
    },

    /* ---------- 1.2 个人信息卡 ---------- */
    renderProfile: function () {
      var p = (window.SITE && window.SITE.profile) || {};
      var s = C.siteStats();

      var avatar = document.getElementById("profileAvatar");
      if (avatar && p.avatar) avatar.src = p.avatar;

      var name = document.getElementById("profileName");
      if (name) {
        name.innerHTML = esc(p.name || "小窝主人") +
          (p.status && p.status.text
            ? '<span class="chip chip--dark" title="当前状态">' +
              (p.status.emoji || "✨") + " " + esc(p.status.text) + "</span>"
            : "");
      }

      var role = document.getElementById("profileRole");
      if (role) role.textContent = p.role || "";
      var bio = document.getElementById("profileBio");
      if (bio) bio.textContent = p.bio || "";

      var row = document.getElementById("profileStats");
      if (row) {
        var items = [
          { num: s.postCount, label: "篇博文" },
          { num: s.tagCount, label: "个标签" },
          { num: s.noteCount, label: "条随笔" },
          { num: Math.round(s.totalWords / 1000) + "k", label: "总字数" },
          { num: s.days, label: "天坚持" },
        ];
        row.innerHTML = items.map(function (it) {
          return '<div class="stat-pill"><span class="stat-pill__num">' + it.num +
            '</span><span class="stat-pill__label">' + it.label + "</span></div>";
        }).join("");
      }
    },

    /* ---------- 1.3 雨夜特效 ---------- */
    startRain: function (rainOpt) {
      var canvas = document.getElementById("heroCanvas");
      if (!canvas || !window.RainFX) return;
      window.__rain = window.RainFX.create(canvas, rainOpt);

      var hero = document.getElementById("hero");
      var hint = document.getElementById("scrollHint");
      if ("IntersectionObserver" in window && hero) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!window.__rain) return;
            if (e.isIntersecting) window.__rain.start();
            else window.__rain.stop();
          });
        }, { threshold: 0.02 });
        io.observe(hero);
      }
      window.addEventListener("scroll", function () {
        if (hint) hint.style.opacity = window.pageYOffset > 120 ? "0" : "1";
      }, { passive: true });
    },

    /* ---------- 1.4 最新博文 ---------- */
    renderLatest: function () {
      var host = document.getElementById("latestPosts");
      if (!host) return;
      var list = C.getLatest(6);
      if (!list.length) {
        host.innerHTML = emptyFor("📝", "还没有文章。登录后台 /admin.html 写第一篇吧～");
        return;
      }
      host.innerHTML = list.map(function (p) { return A.postCard(p); }).join("");
      A.observeReveal(host);
    },

    /* ---------- 1.5 标签云 ---------- */
    renderTagCloud: function () {
      var host = document.getElementById("tagCloud");
      if (!host) return;
      var tags = C.tagStats();
      if (!tags.length) {
        host.innerHTML = '<span class="gb-hint">还没有标签，发文时填上标签就会出现在这里。</span>';
        return;
      }
      host.innerHTML = tags.map(function (t) {
        return '<a class="chip chip--dark lift" href="posts.html?tag=' + encodeURIComponent(t.name) + '">' +
          "# " + esc(t.name) + ' <b style="opacity:.75;font-weight:600">' + t.count + "</b></a>";
      }).join("");
    },

    /* ---------- 1.6 去别处逛逛 ---------- */
    renderExplore: function () {
      var host = document.getElementById("exploreGrid");
      if (!host) return;
      var s = C.siteStats();
      var cards = [
        { href: "posts.html", emoji: "📚", title: "博文", desc: s.postCount + " 篇学习笔记", art: "code" },
        { href: "stats.html", emoji: "📊", title: "统计", desc: "用图表看看这个小站的数据", art: "sky" },
        { href: "essays.html", emoji: "🍃", title: "随笔", desc: s.noteCount + " 条生活碎片", art: "sakura" },
        { href: "gallery.html", emoji: "🖼️", title: "相册", desc: s.photoCount + " 张照片", art: "bokeh" },
        { href: "friends.html", emoji: "🔗", title: "友链", desc: "小伙伴们的站点", art: "grass" },
        { href: "guestbook.html", emoji: "💬", title: "留言板", desc: "来都来了，说点什么吧", art: "lake" },
      ];
      host.innerHTML = cards.map(function (c) {
        var cover = U.artDataURI(c.art, { w: 800, h: 450, seed: c.href });
        return '<a class="post-card glass lift reveal" href="' + c.href + '" ' +
          'style="background:rgba(255,255,255,.1);border-color:rgba(190,245,225,.22)">' +
          '<div class="post-card__cover"><img src="' + cover + '" alt="" loading="lazy"></div>' +
          '<div class="post-card__body">' +
            '<h3 class="post-card__title" style="color:#f0fbf6">' + c.emoji + " " + c.title + "</h3>" +
            '<p class="post-card__excerpt" style="color:rgba(233,250,243,.72)">' + esc(c.desc) + "</p>" +
            '<div class="post-card__meta" style="color:rgba(214,240,232,.55)">' +
              '<span class="spacer"></span><span style="color:var(--c-lake-200);font-weight:600">进入 →</span>' +
            "</div>" +
          "</div></a>";
      }).join("");
      A.observeReveal(host);
    },
  };

  /* ==========================================================================
   * 2. 博文列表页
   * ======================================================================== */
  var Posts = {
    state: { q: "", category: "全部", tag: "", sort: "new", page: 1, perPage: 6 },

    init: function () {
      var self = this;
      var s = C.siteStats();

      var head = document.getElementById("pageHead");
      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "📚",
          title: "博文",
          desc: "我的学习笔记：编程、课程、踩坑记录。用 markdown 写作，支持代码高亮。",
          stats: s.postCount
            ? [
                { text: "共 " + s.postCount + " 篇", cls: "chip--matcha" },
                { text: "约 " + (s.totalWords / 1000).toFixed(1) + "k 字", cls: "chip--sky" },
                { text: "累计阅读 " + s.totalReadTime + " 分钟", cls: "chip--cream" },
                { text: "最后更新 " + U.formatDate(s.lastDate), cls: "chip--sakura" },
              ]
            : [{ text: "还没有文章", cls: "chip--matcha" }],
        });
      }

      /* 网址里带 ?tag=xxx / ?category=xxx 时自动筛选（首页标签云跳过来会用到） */
      var qTag = U.getQuery("tag", "");
      var qCat = U.getQuery("category", "");
      var qKey = U.getQuery("q", "");
      if (qTag) this.state.tag = qTag;
      if (qCat) this.state.category = qCat;
      if (qKey) this.state.q = qKey;

      /* 一条内容都没有时，不显示搜索工具栏，只显示提示 */
      if (!s.postCount) {
        var host = document.getElementById("postList");
        if (host) host.innerHTML = emptyFor("📝", "还没有文章。登录后台 /admin.html 写第一篇吧～");
        return;
      }

      this.renderToolbar();
      this.renderList();
    },

    renderToolbar: function () {
      var self = this;
      var host = document.getElementById("toolbar");
      if (!host) return;

      var cats = ["全部"].concat(C.categoryStats().map(function (c) { return c.name; }));
      var tags = C.tagStats();

      host.innerHTML =
        '<div class="toolbar glass reveal">' +
          '<input class="field" id="postSearch" type="search" placeholder="🔍 搜索标题、标签或正文关键词…" value="' +
            U.escapeAttr(this.state.q) + '" aria-label="搜索博文">' +
          '<div class="toolbar__chips" id="catChips">' +
            cats.map(function (c) {
              return '<span class="chip' + (c === self.state.category ? " chip--matcha" : "") +
                '" data-cat="' + U.escapeAttr(c) + '" role="button" tabindex="0">' + esc(c) + "</span>";
            }).join("") +
          "</div>" +
          '<select class="field" id="postSort" style="flex:0 0 150px" aria-label="排序方式">' +
            '<option value="new">最新发布</option>' +
            '<option value="old">最早发布</option>' +
            '<option value="words">篇幅最长</option>' +
          "</select>" +
        "</div>" +
        '<div class="toolbar__chips" id="tagChips" style="margin:-8px 0 20px 4px">' +
          (this.state.tag ? '<span class="chip chip--sakura" data-tag="" role="button" tabindex="0">✕ 取消标签：' +
            esc(this.state.tag) + "</span>" : "") +
          tags.slice(0, 12).map(function (t) {
            return '<span class="chip' + (t.name === self.state.tag ? " chip--sakura" : "") +
              '" data-tag="' + U.escapeAttr(t.name) + '" role="button" tabindex="0">#' + esc(t.name) +
              " " + t.count + "</span>";
          }).join("") +
        "</div>";

      document.getElementById("postSort").value = this.state.sort;

      document.getElementById("postSearch").addEventListener("input", U.debounce(function (e) {
        self.state.q = e.target.value;
        self.state.page = 1;
        self.renderList();
      }, 250));

      document.getElementById("catChips").addEventListener("click", function (e) {
        var chip = e.target.closest("[data-cat]");
        if (!chip) return;
        self.state.category = chip.getAttribute("data-cat");
        self.state.page = 1;
        A.$$("[data-cat]", host).forEach(function (c) {
          c.classList.toggle("chip--matcha", c.getAttribute("data-cat") === self.state.category);
        });
        self.renderList();
      });

      document.getElementById("tagChips").addEventListener("click", function (e) {
        var chip = e.target.closest("[data-tag]");
        if (!chip) return;
        self.state.tag = chip.getAttribute("data-tag");
        self.state.page = 1;
        self.renderToolbar();
        self.renderList();
      });

      document.getElementById("postSort").addEventListener("change", function (e) {
        self.state.sort = e.target.value;
        self.renderList();
      });
    },

    renderList: function () {
      var self = this;
      var host = document.getElementById("postList");
      var pager = document.getElementById("postPager");
      if (!host) return;

      var list = C.query({
        q: this.state.q,
        category: this.state.category,
        tag: this.state.tag,
        sort: this.state.sort,
      });

      var info = document.getElementById("listInfo");
      if (info) {
        var parts = [];
        if (this.state.q) parts.push('关键词「' + esc(this.state.q) + "」");
        if (this.state.category !== "全部") parts.push("分类「" + esc(this.state.category) + "」");
        if (this.state.tag) parts.push("标签「" + esc(this.state.tag) + "」");
        info.innerHTML = parts.length
          ? "筛选条件：" + parts.join(" + ") + "，共找到 <b>" + list.length + "</b> 篇"
          : "共 <b>" + list.length + "</b> 篇文章，按发布时间从新到旧排列";
      }

      if (!list.length) {
        host.innerHTML = A.emptyState("🔍", "没有找到匹配的文章，换个关键词或取消筛选试试");
        if (pager) pager.innerHTML = "";
        return;
      }

      var per = this.state.perPage;
      var totalPages = Math.ceil(list.length / per);
      if (this.state.page > totalPages) this.state.page = totalPages;
      var start = (this.state.page - 1) * per;

      host.innerHTML = list.slice(start, start + per).map(function (p) { return A.postCard(p); }).join("");
      A.observeReveal(host);

      if (!pager) return;
      if (totalPages <= 1) { pager.innerHTML = ""; return; }

      var btns = '<button type="button" data-page="' + (this.state.page - 1) + '"' +
        (this.state.page === 1 ? " disabled" : "") + ">← 上一页</button>";
      for (var p = 1; p <= totalPages; p++) {
        btns += '<button type="button" data-page="' + p + '"' +
          (p === this.state.page ? ' class="is-active"' : "") + ">" + p + "</button>";
      }
      btns += '<button type="button" data-page="' + (this.state.page + 1) + '"' +
        (this.state.page === totalPages ? " disabled" : "") + ">下一页 →</button>";
      pager.innerHTML = btns;

      pager.onclick = function (e) {
        var btn = e.target.closest("button[data-page]");
        if (!btn || btn.disabled) return;
        self.state.page = Number(btn.getAttribute("data-page"));
        self.renderList();
        var top = host.getBoundingClientRect().top + window.pageYOffset - 120;
        window.scrollTo({ top: top, behavior: "smooth" });
      };
    },
  };

  /* ==========================================================================
   * 3. 博文详情页
   * ======================================================================== */
  var Post = {
    init: function () {
      var slug = U.getQuery("p", "");
      var post = slug ? C.getBySlug(slug) : null;
      var host = document.getElementById("postDetail");
      if (!host) return;

      /* --- 找不到文章 --- */
      if (!post) {
        host.innerHTML = A.pageHead({ emoji: "🌫️", title: "找不到这篇文章" }) +
          '<div class="glass" style="padding:28px;border-radius:var(--r-lg)">' +
            (C.state && C.state.ok
              ? "<p>可能这篇文章被删掉了，或者链接复制得不完整。</p>"
              : "<p>" + esc((C.state && C.state.message) || "读取数据失败。") + "</p>") +
            '<p><a class="btn btn--primary" href="posts.html">← 回到博文列表</a></p>' +
          "</div>";
        return;
      }

      document.title = post.title + " · " + ((window.SITE && window.SITE.name) || "我的小窝");
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = post.excerpt;

      var rendered = window.MD.render(post.content, { toc: true });
      var cover = U.coverSrc(post.cover, { w: 1200, h: 500, seed: post.slug });

      host.innerHTML =
        '<header class="post-header glass reveal">' +
          '<div class="post-header__meta">' +
            '<span class="chip chip--matcha">' + esc(post.category) + "</span>" +
            "<span>🗓 " + U.formatDate(post.date) + "</span>" +
            "<span>⏱ " + post.readTime + " 分钟</span>" +
            "<span>✍️ " + post.words + " 字</span>" +
            "<span>👀 " + (post.views || 0) + " 次阅读</span>" +
          "</div>" +
          '<h1 class="post-title">' + esc(post.title) + "</h1>" +
          (post.excerpt ? '<p class="post-excerpt">' + esc(post.excerpt) + "</p>" : "") +
          '<div class="post-tags">' +
            post.tags.map(function (t) {
              return '<a class="chip" href="posts.html?tag=' + encodeURIComponent(t) + '"># ' + esc(t) + "</a>";
            }).join("") +
          "</div>" +
        "</header>" +
        '<img class="post-cover" src="' + cover + '" alt="' + U.escapeAttr(post.title) + ' 封面">' +
        '<div class="post-layout">' +
          '<article class="post-content glass">' +
            (post.content && post.content.trim()
              ? rendered.html
              : '<p class="md-p">这篇文章还没有正文内容。</p>') +
            /* 文章底部：点赞 + 分享（点赞数记在你自己浏览器里） */
            this.footerActionsHTML(post) +
          "</article>" +
          '<aside class="post-aside">' +
            (rendered.toc.length > 2
              ? '<nav class="toc glass lift" aria-label="文章目录"><h2 class="toc__title">📑 本文目录</h2>' +
                  '<ul id="tocList">' + rendered.toc.map(function (h) {
                    return '<li class="toc__item toc__item--h' + h.level + '">' +
                      '<a href="#' + h.id + '" data-target="' + h.id + '">' + esc(h.text) + "</a></li>";
                  }).join("") + "</ul></nav>"
              : "") +
            '<div class="post-aside__card glass lift">' +
              "<h2>🧭 快速操作</h2>" +
              '<button class="btn" id="copyLink" type="button" style="width:100%;justify-content:center">🔗 复制本文链接</button>' +
              '<a class="btn" href="posts.html" style="width:100%;justify-content:center;margin-top:8px">📚 返回列表</a>' +
            "</div>" +
          "</aside>" +
        "</div>" +
        this.neighborHTML(post) +
        /* 评论区（数据存在数据库里，别人也能看到） */
        '<section class="section" id="commentSection" style="margin-top:42px">' +
          '<div class="section__head"><h2 class="section__title">💬 评论</h2>' +
            '<span class="section__more" id="commentCount" style="cursor:default;opacity:.8"></span></div>' +
          '<div id="commentForm"></div>' +
          '<div class="gb-list" id="commentList" style="margin-top:20px"></div>' +
        "</section>" +
        this.relatedHTML(post);

      A.initCopyButtons(host);
      A.observeReveal(host);
      this.bindTocScrollSpy(rendered.toc);
      this.bindCopyLink();
      this.initLike(post);

      /* 浏览量 +1（后台统计页的「总阅读」就是这个数） */
      if (window.Store && C.state && C.state.ok) window.Store.increaseViews(post.slug);

      Comments.init(post.slug);
    },

    /** 文章底部的点赞 / 分享按钮 */
    footerActionsHTML: function (post) {
      var liked = U.store("nest-liked-posts") || {};
      var count = (post.views || 0) + (liked[post.slug] ? 0 : 0); // 仅用于占位，实际显示点赞数
      void count;
      var likeCount = (U.store("nest-like-count-" + post.slug) || 0) + (liked[post.slug] ? 1 : 0);
      return '<div class="post-actions">' +
        '<button class="btn" type="button" id="likePost" data-slug="' + U.escapeAttr(post.slug) + '">' +
          (liked[post.slug] ? "💗 已读过" : "🤍 标记为已读") +
          ' <b style="font-weight:600" id="likeCount">' + likeCount + "</b></button>" +
        '<button class="btn" type="button" id="sharePost">🔗 分享这篇文章</button>' +
        '<a class="btn" href="posts.html">📚 更多文章</a>' +
      "</div>";
    },

    /** 标记已读（本地记录，方便你知道哪些读过了） */
    initLike: function (post) {
      var btn = document.getElementById("likePost");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var liked = U.store("nest-liked-posts") || {};
        liked[post.slug] = !liked[post.slug];
        U.store("nest-liked-posts", liked);

        var base = U.store("nest-like-count-" + post.slug) || 0;
        var countEl = document.getElementById("likeCount");
        if (countEl) countEl.textContent = base + (liked[post.slug] ? 1 : 0);
        btn.firstChild.textContent = liked[post.slug] ? "💗 已读过 " : "🤍 标记为已读 ";
      });

      var share = document.getElementById("sharePost");
      if (share) {
        share.addEventListener("click", function () {
          var url = window.location.href;
          var done = function () {
            share.textContent = "已复制链接 ✓";
            setTimeout(function () { share.textContent = "🔗 分享这篇文章"; }, 1600);
          };
          if (navigator.share) {
            navigator.share({ title: post.title, url: url }).catch(function () {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(done).catch(done);
          } else { done(); }
        });
      }
    },

    neighborHTML: function (post) {
      var nb = C.getNeighbors(post.slug);
      if (!nb.prev && !nb.next) return "";
      function item(p, dir) {
        if (!p) return '<div class="post-nav__item is-empty"></div>';
        return '<a class="post-nav__item glass lift" href="post.html?p=' + encodeURIComponent(p.slug) + '">' +
          '<span class="post-nav__dir">' + (dir === "prev" ? "← 上一篇" : "下一篇 →") + "</span>" +
          '<span class="post-nav__title">' + esc(p.title) + "</span>" +
          '<span class="post-nav__date">' + U.formatDate(p.date) + "</span></a>";
      }
      return '<nav class="post-nav" aria-label="文章导航">' + item(nb.prev, "prev") + item(nb.next, "next") + "</nav>";
    },

    relatedHTML: function (post) {
      var list = C.getRelated(post.slug, 3);
      if (!list.length) return "";
      return '<section class="section" style="margin-top:42px">' +
        '<div class="section__head"><h2 class="section__title">相关推荐</h2>' +
          '<a class="section__more" href="posts.html?category=' + encodeURIComponent(post.category) + '">同分类更多 →</a>' +
        "</div>" +
        '<div class="post-grid">' + list.map(function (p) { return A.postCard(p, { compact: true }); }).join("") + "</div>" +
        "</section>";
    },

    bindTocScrollSpy: function (toc) {
      if (!toc.length) return;
      var links = A.$$("#tocList a");
      if (!links.length) return;
      var headings = links.map(function (a) {
        return document.getElementById(a.getAttribute("data-target"));
      }).filter(Boolean);

      function update() {
        var current = null;
        var offset = window.innerHeight * 0.28;
        headings.forEach(function (h) {
          if (h.getBoundingClientRect().top <= offset) current = h.id;
        });
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("data-target") === current);
        });
      }
      window.addEventListener("scroll", U.throttle(update, 120), { passive: true });
      update();
    },

    bindCopyLink: function () {
      var btn = document.getElementById("copyLink");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var url = window.location.href;
        var done = function () {
          btn.textContent = "已复制 ✓";
          setTimeout(function () { btn.textContent = "🔗 复制本文链接"; }, 1600);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done);
        else done();
      });
    },
  };

  /* ==========================================================================
   * 3.1 评论区（存在数据库里，所有人都能看到）
   * ======================================================================== */
  var Comments = {
    init: function (slug) {
      this.slug = slug;
      this.renderForm();
      this.load();
    },

    renderForm: function () {
      var self = this;
      var host = document.getElementById("commentForm");
      if (!host) return;

      /* 数据库没连上时，只提示，不给表单（免得填了半天发不出去） */
      if (!C.state || !C.state.ok) {
        host.innerHTML = dbNotReadyHTML("💬 评论功能暂时用不了");
        return;
      }

      host.innerHTML =
        '<div class="gb-form glass reveal">' +
          '<div class="gb-form__row">' +
            '<div><label class="field-label" for="cmName">你的昵称 <span style="color:#ef8fae">*</span></label>' +
              '<input class="field" id="cmName" type="text" maxlength="24" placeholder="怎么称呼你？"></div>' +
            '<div style="display:flex;align-items:flex-end">' +
              '<button class="btn btn--primary" id="cmSubmit" type="button" style="width:100%;justify-content:center">🚀 发表评论</button>' +
            "</div>" +
          "</div>" +
          '<label class="field-label" for="cmText">评论内容 <span style="color:#ef8fae">*</span></label>' +
          '<textarea class="field" id="cmText" maxlength="500" placeholder="说点什么吧，最多 500 字…"></textarea>' +
          '<div class="gb-form__foot">' +
            '<span class="gb-hint" id="cmTip">评论会立刻出现在下面，所有人都能看到。</span>' +
          "</div>" +
        "</div>";

      document.getElementById("cmSubmit").addEventListener("click", function () { self.submit(); });
      document.getElementById("cmText").addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") self.submit();
      });
    },

    load: function () {
      var self = this;
      var host = document.getElementById("commentList");
      if (!host || !C.state || !C.state.ok) return;

      window.Store.fetchComments(this.slug)
        .then(function (rows) {
          var countEl = document.getElementById("commentCount");
          if (countEl) countEl.textContent = rows.length ? "共 " + rows.length + " 条" : "";
          if (!rows.length) {
            host.innerHTML = A.emptyState("💭", "还没有评论，来做第一个留言的人吧～");
            return;
          }
          host.innerHTML = rows.map(function (c) { return self.itemHTML(c); }).join("");
          A.observeReveal(host);
        })
        .catch(function (err) {
          host.innerHTML = A.emptyState("⚠️", err.message);
        });
    },

    itemHTML: function (c) {
      var name = c.name || "匿名";
      var color = U.THEMES[["sakura", "sky", "matcha", "cream", "sun", "lilac"][name.length % 6]];
      var time = "";
      try {
        var d = new Date(c.created_at);
        time = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " +
          String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      } catch (e) { time = ""; }

      return '<article class="gb-item glass lift reveal">' +
        '<span class="gb-item__avatar" style="background:linear-gradient(150deg,' + color.from + "," + color.to + ')">' +
          esc(name.charAt(0).toUpperCase()) + "</span>" +
        '<div style="flex:1;min-width:0">' +
          '<div class="gb-item__head">' +
            '<span class="gb-item__name">' + esc(name) + "</span>" +
            '<span class="gb-item__time">' + time + " · " + U.timeAgo(c.created_at) + "</span>" +
          "</div>" +
          '<p class="gb-item__text">' + esc(c.text) + "</p>" +
        "</div>" +
      "</article>";
    },

    submit: function () {
      var self = this;
      var nameEl = document.getElementById("cmName");
      var textEl = document.getElementById("cmText");
      var tip = document.getElementById("cmTip");
      var name = (nameEl.value || "").trim();
      var text = (textEl.value || "").trim();

      function warn(msg, el) {
        tip.textContent = "⚠️ " + msg;
        tip.style.color = "#c2506f";
        if (el) el.focus();
        setTimeout(function () { tip.style.color = ""; tip.textContent = "评论会立刻出现在下面，所有人都能看到。"; }, 2600);
      }

      if (name.length < 1) return warn("昵称不能为空", nameEl);
      if (text.length < 2) return warn("评论太短啦", textEl);

      var btn = document.getElementById("cmSubmit");
      btn.disabled = true;
      btn.textContent = "发送中…";

      window.Store.addComment(this.slug, name, text)
        .then(function () {
          textEl.value = "";
          btn.disabled = false;
          btn.textContent = "🚀 发表评论";
          tip.textContent = "✅ 评论成功，谢谢你的留言！";
          tip.style.color = "#2f8f6f";
          setTimeout(function () { tip.style.color = ""; tip.textContent = "评论会立刻出现在下面，所有人都能看到。"; }, 2600);
          self.load();
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = "🚀 发表评论";
          warn(err.message);
        });
    },
  };

  /* ==========================================================================
   * 4. 统计页
   * ======================================================================== */
  var Stats = {
    init: function () {
      var s = C.siteStats();

      var head = document.getElementById("pageHead");
      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "📊",
          title: "统计",
          desc: "这个小站的数据：写了多少字、什么时候写得最多、都写了些什么。数据直接从数据库实时统计。",
          stats: s.postCount
            ? [
                { text: "共 " + s.postCount + " 篇", cls: "chip--matcha" },
                { text: "累计 " + s.totalViews + " 次阅读", cls: "chip--sky" },
                { text: "已坚持 " + s.days + " 天", cls: "chip--cream" },
              ]
            : [{ text: "还没有数据", cls: "chip--matcha" }],
        });
      }

      /* 一条内容都没有：给提示，不画空图 */
      if (!s.postCount) {
        var grid = document.getElementById("metricGrid");
        if (grid) grid.innerHTML = emptyFor("📊", "还没有文章，等发了第一篇，这里就会出现图表。");
        ["chartCategory", "chartTrend", "chartDonut", "chartTags", "highlights", "yearTable"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.innerHTML = "";
        });
        return;
      }

      this.renderMetrics(s);
      this.renderCharts(s);
      this.renderTables(s);
    },

    renderMetrics: function (s) {
      var host = document.getElementById("metricGrid");
      if (!host) return;
      var items = [
        { icon: "📚", num: s.postCount, label: "篇文章" },
        { icon: "🏷️", num: s.tagCount, label: "个标签" },
        { icon: "🗂️", num: s.categoryCount, label: "个分类" },
        { icon: "✍️", num: s.totalWords.toLocaleString(), label: "总字数" },
        { icon: "⏱️", num: s.totalReadTime + " 分", label: "累计阅读时长" },
        { icon: "👀", num: s.totalViews, label: "总阅读次数" },
        { icon: "🍃", num: s.noteCount, label: "条随笔" },
        { icon: "🖼️", num: s.photoCount, label: "张照片" },
      ];
      host.innerHTML = items.map(function (it) {
        return '<div class="metric glass lift reveal">' +
          '<span class="metric__icon" aria-hidden="true">' + it.icon + "</span>" +
          '<span class="metric__num">' + it.num + "</span>" +
          '<span class="metric__label">' + it.label + "</span></div>";
      }).join("");
    },

    renderCharts: function (s) {
      var barHost = document.getElementById("chartCategory");
      if (barHost) {
        barHost.innerHTML = window.Charts.barChart(s.categories, { height: 300, maxBarWidth: 52 });
        window.Charts.bindTips(document.getElementById("chartCategoryWrap"));
      }
      var trendHost = document.getElementById("chartTrend");
      if (trendHost) {
        trendHost.innerHTML = window.Charts.areaChart(s.months.slice(-14), { height: 320 });
        window.Charts.bindTips(document.getElementById("chartTrendWrap"));
      }
      var donutHost = document.getElementById("chartDonut");
      if (donutHost) {
        donutHost.innerHTML = window.Charts.donutChart(s.categories, { width: 320, height: 300 });
        window.Charts.bindTips(document.getElementById("chartDonutWrap"));
      }
      var tagHost = document.getElementById("chartTags");
      if (tagHost) {
        tagHost.innerHTML = window.Charts.barChart(s.tags.slice(0, 10), {
          height: 300, maxBarWidth: 44, rotateLabel: true,
        });
        window.Charts.bindTips(document.getElementById("chartTagsWrap"));
      }
    },

    renderTables: function (s) {
      var yearHost = document.getElementById("yearTable");
      if (yearHost) {
        yearHost.innerHTML =
          '<div class="md-table-wrap"><table class="md-table"><thead><tr>' +
          "<th>年份</th><th>文章数</th><th>字数</th><th>占比</th></tr></thead><tbody>" +
          s.years.map(function (y) {
            var pct = s.totalWords ? ((y.words / s.totalWords) * 100).toFixed(1) : "0";
            return "<tr><td>" + y.year + "</td><td>" + y.count + "</td><td>" +
              y.words.toLocaleString() + "</td><td>" + pct + "%</td></tr>";
          }).join("") +
          "</tbody></table></div>";
      }

      var hlHost = document.getElementById("highlights");
      if (hlHost) {
        var list = [];
        if (s.longestPost) {
          list.push({
            emoji: "📖", title: "篇幅最长",
            text: "《" + s.longestPost.title + "》共 " + s.longestPost.words + " 字",
            href: "post.html?p=" + encodeURIComponent(s.longestPost.slug),
          });
        }
        if (s.busiestMonth) {
          list.push({
            emoji: "🔥", title: "写得最多的月份",
            text: s.busiestMonth.label + "，写了 " + s.busiestMonth.count + " 篇",
            href: "posts.html",
          });
        }
        if (s.tags.length) {
          list.push({
            emoji: "🏷️", title: "最常用的标签",
            text: "#" + s.tags[0].name + " 出现在 " + s.tags[0].count + " 篇文章里",
            href: "posts.html?tag=" + encodeURIComponent(s.tags[0].name),
          });
        }
        list.push({
          emoji: "🌱", title: "第一篇文章",
          text: "发布于 " + U.formatDate(s.firstDate) + "，到今天已经 " + s.days + " 天",
          href: "posts.html",
        });
        hlHost.innerHTML = list.map(function (it) {
          return '<a class="glass lift reveal" href="' + it.href + '" style="padding:18px 20px;border-radius:var(--r-lg);display:block">' +
            '<div style="font-size:1.2rem">' + it.emoji + "</div>" +
            '<div style="font-weight:700;color:var(--c-ink);margin:6px 0 4px">' + esc(it.title) + "</div>" +
            '<div style="font-size:13.2px;color:var(--c-ink-mute)">' + esc(it.text) + "</div></a>";
        }).join("");
      }
      A.observeReveal();
    },
  };

  /* ==========================================================================
   * 5. 随笔页
   * ======================================================================== */
  var Essays = {
    init: function () {
      var list = C.notes();
      var host = document.getElementById("essayTimeline");
      var head = document.getElementById("pageHead");

      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "🍃",
          title: "随笔",
          desc: "比博文更碎的记录：今天学了什么、踩了什么坑、心情如何。有点像说说，但更安静一点。",
          stats: list.length
            ? [{ text: "共 " + list.length + " 条", cls: "chip--matcha" },
               { text: "最新 " + U.formatDate(list[0].date), cls: "chip--sky" }]
            : [{ text: "还没有随笔", cls: "chip--matcha" }],
        });
      }
      if (!host) return;

      if (!list.length) {
        host.innerHTML = emptyFor("🍃", "还没有随笔。登录后台 /admin.html 的「随笔」标签发一条吧～");
        return;
      }

      var liked = U.store("nest-liked-notes") || {};

      host.innerHTML = list.map(function (n) {
        var imgs = (n.images || []).map(function (img) {
          var src = img && img.src ? img.src
            : U.artDataURI((img && img.art) || "bokeh", { w: 600, h: 600, seed: n.id + ((img && img.art) || "") });
          return '<img src="' + src + '" alt="随笔配图" loading="lazy" data-zoom="' + src + '" data-caption="' +
            U.escapeAttr(n.date + (n.mood ? " · " + n.mood : "")) + '">';
        }).join("");

        var likeCount = (n.likes || 0) + (liked[n.id] ? 1 : 0);

        return '<article class="tl-item glass lift reveal" data-id="' + esc(n.id) + '">' +
          '<div class="tl-item__head">' +
            (n.mood ? '<span class="tl-item__mood">' + esc(n.mood) + "</span>" : "") +
            "<span>🗓 " + U.formatDate(n.date) + "</span>" +
            "<span>· " + U.timeAgo(n.date) + "</span>" +
          "</div>" +
          '<p class="tl-item__text">' + esc(n.text) + "</p>" +
          (imgs ? '<div class="tl-item__imgs">' + imgs + "</div>" : "") +
          '<div class="tl-item__foot">' +
            '<button class="chip' + (liked[n.id] ? " chip--sakura" : "") + '" type="button" data-like="' + esc(n.id) + '">' +
              (liked[n.id] ? "💗" : "🤍") + ' <b data-like-count style="font-weight:600">' + likeCount + "</b>" +
            "</button>" +
            "<span>写下这些字的时候，天气应该还不错 🌤️</span>" +
          "</div>" +
        "</article>";
      }).join("");

      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-like]");
        if (!btn) return;
        var id = btn.getAttribute("data-like");
        liked[id] = !liked[id];
        U.store("nest-liked-notes", liked);
        btn.classList.toggle("chip--sakura", !!liked[id]);
        var base = (list.filter(function (n) { return n.id === id; })[0] || {}).likes || 0;
        var countEl = btn.querySelector("[data-like-count]");
        if (countEl) countEl.textContent = base + (liked[id] ? 1 : 0);
        btn.firstChild.textContent = liked[id] ? "💗 " : "🤍 ";
      });

      A.observeReveal(host);
      A.initLightbox(host);
    },
  };

  /* ==========================================================================
   * 6. 相册页
   * ======================================================================== */
  var Gallery = {
    init: function () {
      var list = C.gallery();
      var host = document.getElementById("galleryGrid");
      var head = document.getElementById("pageHead");

      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "🖼️",
          title: "相册",
          desc: "随手记录的画面。在后台「相册」标签里上传图片，点图片可以放大看。",
          stats: list.length
            ? [{ text: "共 " + list.length + " 张", cls: "chip--matcha" },
               { text: "点击图片可放大查看", cls: "chip--sky" }]
            : [{ text: "相册还是空的", cls: "chip--matcha" }],
        });
      }
      if (!host) return;

      if (!list.length) {
        host.innerHTML = emptyFor("🖼️", "相册还是空的。登录后台 /admin.html 的「相册」标签传几张照片吧～");
        return;
      }

      host.innerHTML = list.map(function (g, idx) {
        var src = g.src ? g.src : U.artDataURI(g.art || "bokeh", {
          w: 900, h: idx % 3 === 1 ? 1100 : 700, seed: (g.title || "") + idx,
        });
        return '<figure class="gallery__item glass reveal" data-zoom="' + src + '" data-caption="' +
            U.escapeAttr(g.title + " · " + (g.date || "")) + '" tabindex="0" role="button" aria-label="查看大图：' +
            U.escapeAttr(g.title) + '">' +
          '<img src="' + src + '" alt="' + U.escapeAttr(g.title) + '" loading="lazy">' +
          '<figcaption class="gallery__cap">' + esc(g.title) +
            "<small>" + U.formatDate(g.date) + (g.desc ? " · " + esc(g.desc) : "") + "</small>" +
          "</figcaption>" +
        "</figure>";
      }).join("");

      A.observeReveal(host);
      A.initLightbox(host);
    },
  };

  /* ==========================================================================
   * 7. 友链页
   * ======================================================================== */
  var Friends = {
    init: function () {
      var list = C.friends();
      var host = document.getElementById("friendGrid");
      var head = document.getElementById("pageHead");

      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "🔗",
          title: "友链",
          desc: "这里是我的小伙伴们。想交换友链的话，在留言板留言或者发邮件给我都可以～",
          stats: list.length
            ? [{ text: "共 " + list.length + " 位朋友", cls: "chip--matcha" }]
            : [{ text: "还没有友链", cls: "chip--matcha" }],
        });
      }
      if (!host) return;

      if (!list.length) {
        host.innerHTML = emptyFor("🔗", "还没有添加友链。登录后台 /admin.html 的「友链」标签可以添加。");
      } else {
        host.innerHTML = list.map(function (f) {
          var avatar = f.avatar
            ? '<img src="' + U.escapeAttr(f.avatar) + '" alt="' + U.escapeAttr(f.name) + ' 的头像" ' +
              'style="width:100%;height:100%;object-fit:cover">'
            : esc(String(f.name || "?").charAt(0).toUpperCase());
          var color = U.THEMES[f.color] || U.THEMES.sakura;
          return '<a class="link-card glass lift reveal" href="' + U.escapeAttr(f.url) + '" target="_blank" rel="noopener">' +
            '<span class="link-card__avatar" style="background:linear-gradient(150deg,' + color.from + "," + color.to + ')">' +
              avatar + "</span>" +
            "<span>" +
              '<span class="link-card__name">' + esc(f.name) +
                ' <span style="font-size:12px;color:var(--c-ink-faint)">↗</span></span>' +
              '<span class="link-card__desc" style="display:block">' + esc(f.desc || "") + "</span>" +
              '<span class="link-card__url">' + esc(String(f.url).replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</span>" +
            "</span></a>";
        }).join("");
        A.observeReveal(host);
      }

      /* 自助申请友链的说明 */
      var applyHost = document.getElementById("friendApply");
      if (applyHost) {
        var p = (window.SITE && window.SITE.profile) || {};
        var mail = ((p.socials || []).filter(function (s) { return /^mailto:/i.test(s.href); })[0] || {}).href || "#";
        applyHost.innerHTML =
          '<div class="glass lift" style="padding:22px 24px;border-radius:var(--r-lg)">' +
            '<h2 class="section__title" style="margin-bottom:12px">想和我交换友链？</h2>' +
            "<p>把你的站点信息发给我，我会加到上面的列表里：</p>" +
            '<div class="md-table-wrap"><table class="md-table"><thead><tr><th>需要的信息</th><th>示例</th></tr></thead><tbody>' +
              "<tr><td>站点名称</td><td>小明的博客</td></tr>" +
              "<tr><td>站点地址</td><td>https://example.com</td></tr>" +
              "<tr><td>一句话简介</td><td>一个爱写代码的大学生</td></tr>" +
              "<tr><td>头像图片地址</td><td>https://example.com/avatar.png</td></tr>" +
            "</tbody></table></div>" +
            '<p style="margin-top:14px">' +
              '<a class="btn btn--primary" href="guestbook.html">💬 去留言板留言</a> ' +
              '<a class="btn" href="' + mail + '">✉️ 发邮件给我</a>' +
            "</p>" +
          "</div>";
      }
    },
  };

  /* ==========================================================================
   * 8. 更新日志页
   * ======================================================================== */
  var Log = {
    init: function () {
      var list = C.logs();
      var host = document.getElementById("logList");
      var head = document.getElementById("pageHead");
      var types = C.logTypes();

      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "🗓️",
          title: "更新日志",
          desc: "这个小窝的版本记录，按时间倒序排列（最新的在最上面）。每次改完网站我都会在这里记一笔。",
          stats: list.length
            ? [{ text: "共 " + list.length + " 个版本", cls: "chip--matcha" },
               { text: "最新 " + list[0].version, cls: "chip--sky" },
               { text: "更新于 " + U.formatDate(list[0].date), cls: "chip--cream" }]
            : [{ text: "还没有更新记录", cls: "chip--matcha" }],
        });
      }
      if (!host) return;

      if (!list.length) {
        host.innerHTML = emptyFor("🗓️", "还没有更新记录。登录后台 /admin.html 的「更新日志」标签记一条吧～");
        return;
      }

      var filterHost = document.getElementById("logFilter");
      if (filterHost) {
        filterHost.innerHTML = '<span class="chip chip--matcha" data-type="全部" role="button" tabindex="0">全部</span>' +
          types.map(function (t) {
            return '<span class="chip" data-type="' + U.escapeAttr(t.name) + '" role="button" tabindex="0">' +
              esc(t.name) + " " + t.count + "</span>";
          }).join("");
      }

      function render(type) {
        var typeCls = {
          "新增": "chip--matcha", "优化": "chip--sky", "修复": "chip--sakura",
          "文档": "chip--cream", "样式": "chip--sky", "安全": "chip--sakura",
        };
        host.innerHTML = list.map(function (entry) {
          var items = (entry.items || []).filter(function (it) {
            return !type || type === "全部" || it.type === type;
          });
          if (!items.length) return "";
          return '<article class="log-item glass lift reveal">' +
            '<div class="log-item__head">' +
              '<span class="log-ver">' + esc(entry.version) + "</span>" +
              (entry.title ? '<span class="chip chip--cream">' + esc(entry.title) + "</span>" : "") +
              '<span class="log-date">🗓 ' + U.formatDate(entry.date) + "</span>" +
            "</div>" +
            "<ul>" + items.map(function (it) {
              return '<li><span class="chip ' + (typeCls[it.type] || "chip--sky") +
                '" style="margin-right:6px;font-size:11.4px">' + esc(it.type || "其他") + "</span>" +
                esc(it.text) + "</li>";
            }).join("") + "</ul>" +
          "</article>";
        }).join("") || A.emptyState("🔍", "这个类型下暂时没有记录");
        A.observeReveal(host);
      }

      render("全部");

      if (filterHost) {
        filterHost.addEventListener("click", function (e) {
          var chip = e.target.closest("[data-type]");
          if (!chip) return;
          A.$$("[data-type]", filterHost).forEach(function (c) {
            c.classList.toggle("chip--matcha", c === chip);
          });
          render(chip.getAttribute("data-type"));
        });
      }
    },
  };

  /* ==========================================================================
   * 9. 留言板（存在数据库里，所有人都能看到）
   * ======================================================================== */
  var Guestbook = {
    init: function () {
      var head = document.getElementById("pageHead");
      var st = C.state || {};

      if (head) {
        head.innerHTML = A.pageHead({
          emoji: "💬",
          title: "留言板",
          desc: "来都来了，说点什么吧～ 吐槽、建议、交换友链、或者只是打个招呼都欢迎。",
          stats: [
            { text: "无需登录即可留言", cls: "chip--matcha" },
            { text: "留言会保存到数据库", cls: "chip--sky" },
          ],
        });
      }

      if (!st.ok) {
        /* 数据库没连上时，不给表单（免得填了半天发不出去），
           而是把「具体原因 + 怎么修」直接写在页面上 */
        var formHost = document.getElementById("gbForm");
        if (formHost) formHost.innerHTML = dbNotReadyHTML("💬 留言板暂时用不了");
        var listHost = document.getElementById("gbList");
        if (listHost) listHost.innerHTML = "";
        var pinnedHost = document.getElementById("gbPinned");
        if (pinnedHost) pinnedHost.innerHTML = "";
        return;
      }

      this.renderForm();
      this.load();
    },

    renderForm: function () {
      var self = this;
      var host = document.getElementById("gbForm");
      if (!host) return;

      host.innerHTML =
        '<div class="gb-form glass reveal">' +
          '<div class="gb-form__row">' +
            '<div><label class="field-label" for="gbName">昵称 <span style="color:#ef8fae">*</span></label>' +
              '<input class="field" id="gbName" type="text" maxlength="24" placeholder="怎么称呼你？" autocomplete="nickname"></div>' +
            '<div style="display:flex;align-items:flex-end">' +
              '<button class="btn btn--primary" id="gbSubmit" type="button" style="width:100%;justify-content:center">🚀 发布留言</button>' +
            "</div>" +
          "</div>" +
          '<label class="field-label" for="gbText">留言内容 <span style="color:#ef8fae">*</span></label>' +
          '<textarea class="field" id="gbText" maxlength="500" placeholder="写点什么吧，最多 500 个字…"></textarea>' +
          '<div class="gb-form__foot">' +
            '<span class="gb-hint" id="gbCounter">0 / 500</span>' +
            '<span class="gb-hint" id="gbTip">留言会保存到数据库，刷新和换设备都能看到。</span>' +
          "</div>" +
        "</div>";

      var text = document.getElementById("gbText");
      var counter = document.getElementById("gbCounter");
      text.addEventListener("input", function () {
        var len = text.value.length;
        counter.textContent = len + " / 500";
        counter.style.color = len > 450 ? "#ef8fae" : "";
      });
      document.getElementById("gbSubmit").addEventListener("click", function () { self.submit(); });
      text.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") self.submit();
      });
    },

    submit: function () {
      var self = this;
      var nameEl = document.getElementById("gbName");
      var textEl = document.getElementById("gbText");
      var tip = document.getElementById("gbTip");
      var name = (nameEl.value || "").trim();
      var text = (textEl.value || "").trim();

      function warn(msg, el) {
        tip.textContent = "⚠️ " + msg;
        tip.style.color = "#c2506f";
        if (el) el.focus();
        setTimeout(function () {
          tip.style.color = "";
          tip.textContent = "留言会保存到数据库，刷新和换设备都能看到。";
        }, 2600);
      }

      if (name.length < 1) return warn("昵称不能为空哦", nameEl);
      if (text.length < 2) return warn("留言内容太短啦", textEl);

      var btn = document.getElementById("gbSubmit");
      btn.disabled = true;
      btn.textContent = "发送中…";

      window.Store.addComment("guestbook", name, text)
        .then(function () {
          textEl.value = "";
          document.getElementById("gbCounter").textContent = "0 / 500";
          btn.disabled = false;
          btn.textContent = "🚀 发布留言";
          tip.textContent = "✅ 留言成功，谢谢你的到访！";
          tip.style.color = "#2f8f6f";
          setTimeout(function () {
            tip.style.color = "";
            tip.textContent = "留言会保存到数据库，刷新和换设备都能看到。";
          }, 2600);
          self.load();
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = "🚀 发布留言";
          warn(err.message);
        });
    },

    load: function () {
      var self = this;
      var host = document.getElementById("gbList");
      var pinned = document.getElementById("gbPinned");
      if (!host) return;

      /* 站长置顶留言（来自网站设置里的 profile，改后台即可） */
      var p = (window.SITE && window.SITE.profile) || {};
      if (pinned) {
        if (p.welcome) {
          pinned.innerHTML =
            '<article class="gb-item glass reveal" style="border-color:rgba(99,184,148,.5)">' +
              '<span class="gb-item__avatar" style="background:linear-gradient(150deg,#2f8f6f,#10493a)">📌</span>' +
              '<div style="flex:1">' +
                '<div class="gb-item__head"><span class="gb-item__name">' + esc(p.name || "站长") + "</span>" +
                  '<span class="chip chip--matcha" style="font-size:11.4px">站长留言</span></div>' +
                '<p class="gb-item__text">' + esc(p.welcome) + "</p>" +
              "</div>" +
            "</article>";
        } else {
          pinned.innerHTML = "";
        }
      }

      /* 留言板用的是 post_slug = "guestbook" 这个特殊标记 */
      window.Store.fetchComments("guestbook")
        .then(function (rows) {
          if (!rows.length) {
            host.innerHTML = A.emptyState("💭", "还没有留言，来抢占第一条吧！");
            return;
          }
          host.innerHTML = rows.map(function (c) { return self.itemHTML(c); }).join("");
          A.observeReveal(host);
        })
        .catch(function (err) {
          host.innerHTML = A.emptyState("⚠️", err.message);
        });
    },

    itemHTML: function (c) {
      var name = c.name || "匿名";
      var color = U.THEMES[["sakura", "sky", "matcha", "cream", "sun", "lilac"][name.length % 6]];
      var time = "";
      try {
        var d = new Date(c.created_at);
        time = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " +
          String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      } catch (e) { time = ""; }

      return '<article class="gb-item glass lift reveal">' +
        '<span class="gb-item__avatar" style="background:linear-gradient(150deg,' + color.from + "," + color.to + ')">' +
          esc(name.charAt(0).toUpperCase()) + "</span>" +
        '<div style="flex:1;min-width:0">' +
          '<div class="gb-item__head">' +
            '<span class="gb-item__name">' + esc(name) + "</span>" +
            '<span class="gb-item__time">' + time + " · " + U.timeAgo(c.created_at) + "</span>" +
          "</div>" +
          '<p class="gb-item__text">' + esc(c.text) + "</p>" +
        "</div>" +
      "</article>";
    },
  };

  /* ==========================================================================
   * 10. 关于我
   * ======================================================================== */
  var About = {
    init: function () {
      var p = (window.SITE && window.SITE.profile) || {};
      var about = (window.SITE && window.SITE.about) || {};
      var s = C.siteStats();
      var host = document.getElementById("aboutContent");
      if (!host) return;

      /* 技能条：在后台「网站设置 → 关于我」里改 */
      var skills = (about.skills || []).filter(function (x) { return x && x.name; });

      /* 成长时间线：同样在后台改 */
      var timeline = (about.timeline || []).filter(function (x) { return x && (x.year || x.text); });

      /* 联系方式：来自个人信息里的社交链接 */
      var socials = (p.socials || []).map(function (x) {
        var ext = /^https?:/i.test(x.href) ? ' target="_blank" rel="noopener"' : "";
        return '<a class="btn" href="' + U.escapeAttr(x.href) + '"' + ext + ">" +
          (x.icon || "🔗") + " " + esc(x.label) + "</a>";
      }).join(" ");

      host.innerHTML =
        '<div class="about-grid">' +
          "<div>" +
            '<section class="about-card glass reveal" style="margin-bottom:var(--gap)">' +
              '<h2 class="section__title">👋 我是谁</h2>' +
              "<p>你好，我是" + esc(p.name || "小窝主人") + (p.role ? "，" + esc(p.role) : "") + "。</p>" +
              (p.bio ? "<p>" + esc(p.bio) + "</p>" : "") +
              (p.intro ? "<p>" + esc(p.intro) + "</p>"
                       : "<p>这个博客是我的学习笔记本：学过的东西如果不写下来，过两周就会忘干净。" +
                         "所以这里的内容偏「笔记」而不是「教程」，都是我真实踩过的坑。</p>") +
              (socials ? '<p style="margin-bottom:0">' + socials + "</p>" : "") +
            "</section>" +

            (timeline.length
              ? '<section class="about-card glass reveal" style="margin-bottom:var(--gap)">' +
                  '<h2 class="section__title">🧭 我的时间线</h2>' +
                  '<div class="log-list" style="margin-top:14px;padding-left:24px">' +
                    timeline.map(function (t) {
                      return '<div class="log-item glass" style="padding:14px 18px">' +
                        '<div class="log-item__head" style="margin-bottom:6px">' +
                          '<span class="log-ver">' + esc(t.year || "") + "</span></div>" +
                        '<div style="font-size:14px;color:var(--c-ink-soft)">' + esc(t.text || "") + "</div></div>";
                    }).join("") +
                  "</div>" +
                "</section>"
              : "") +

            '<section class="about-card glass reveal">' +
              '<h2 class="section__title">🛠️ 这个小站是怎么做的</h2>' +
              "<p>没有用任何框架和构建工具，纯手写练习项目：</p>" +
              '<div class="toolbar__chips">' +
                ["HTML5", "CSS3 变量", "backdrop-filter 毛玻璃", "原生 JavaScript", "Canvas 2D",
                 "Supabase 数据库", "手写 markdown 渲染", "手写 SVG 图表", "Supabase 图片存储",
                 "GitHub Pages"].map(function (t) {
                  return '<span class="chip chip--matcha">' + t + "</span>";
                }).join("") +
              "</div>" +
            "</section>" +
          "</div>" +

          "<div>" +
            (skills.length
              ? '<section class="about-card glass reveal" style="margin-bottom:var(--gap)">' +
                  '<h2 class="section__title">📈 技能熟练度</h2>' +
                  '<div style="margin-top:14px">' +
                    skills.map(function (sk) {
                      var lv = Math.max(0, Math.min(100, Number(sk.level) || 0));
                      return '<div class="skill">' +
                        '<div class="skill__head"><span>' + esc(sk.name) + "</span><span>" + lv + "%</span></div>" +
                        '<div class="skill__bar"><div class="skill__fill" data-level="' + lv + '"></div></div>' +
                      "</div>";
                    }).join("") +
                  "</div>" +
                  '<p class="gb-hint" style="margin:10px 0 0">这些都是自己估的，仅供参考 😅</p>' +
                "</section>"
              : "") +

            '<section class="about-card glass reveal" style="margin-bottom:var(--gap)">' +
              '<h2 class="section__title">📇 小档案</h2>' +
              '<ul class="info-list" style="margin-top:12px">' +
                (p.location ? '<li><span class="k">所在地</span><span class="v">' + esc(p.location) + "</span></li>" : "") +
                (p.status && p.status.text
                  ? '<li><span class="k">当前状态</span><span class="v">' + (p.status.emoji || "") + " " + esc(p.status.text) + "</span></li>"
                  : "") +
                (about.interests
                  ? '<li><span class="k">兴趣爱好</span><span class="v">' + esc(about.interests) + "</span></li>"
                  : "") +
                '<li><span class="k">本站数据</span><span class="v">' +
                  (s.postCount ? s.postCount + " 篇文章 · " + (s.totalWords / 1000).toFixed(1) + "k 字 · " +
                    s.noteCount + " 条随笔" : "刚刚开通，还没有内容") + "</span></li>" +
                (s.firstDate
                  ? '<li><span class="k">第一篇文章</span><span class="v">' + U.formatDate(s.firstDate) + "</span></li>"
                  : "") +
              "</ul>" +
            "</section>" +

            '<section class="about-card glass reveal">' +
              '<h2 class="section__title">✉️ 联系我</h2>' +
              '<p style="margin-top:10px">技术问题欢迎一起讨论，看到都会回（如果不忙的话）。</p>' +
              '<div style="display:flex;flex-direction:column;gap:8px">' +
                (p.socials || []).map(function (x) {
                  var ext = /^https?:/i.test(x.href) ? ' target="_blank" rel="noopener"' : "";
                  return '<a class="btn" href="' + U.escapeAttr(x.href) + '"' + ext +
                    ' style="justify-content:flex-start">' + (x.icon || "🔗") + " " + esc(x.label) + "</a>";
                }).join("") +
                '<a class="btn" href="guestbook.html" style="justify-content:flex-start">💬 去留言板留言</a>' +
              "</div>" +
            "</section>" +
          "</div>" +
        "</div>";

      A.observeReveal(host);

      /* 技能条：进入页面后从 0 涨到目标宽度 */
      setTimeout(function () {
        A.$$(".skill__fill", host).forEach(function (bar) {
          bar.style.width = bar.getAttribute("data-level") + "%";
        });
      }, 260);
    },
  };

  /* ==========================================================================
   * 11. 路由与启动
   * ======================================================================== */
  var ROUTES = {
    home: Home, posts: Posts, post: Post, stats: Stats, essays: Essays,
    gallery: Gallery, friends: Friends, log: Log, guestbook: Guestbook, about: About,
  };

  /**
   * 把数据库里的网站设置合并到 window.SITE
   * 数据库里没写的字段，保留 content/site.js 里的默认值
   */
  function mergeSiteConfig(fromDb) {
    if (!fromDb) return;
    var base = window.SITE || {};
    function mergeObj(a, b) {
      var out = {};
      var k;
      for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
      for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) {
        if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) {
          out[k] = mergeObj(a[k], b[k]);
        } else if (b[k] !== null && b[k] !== undefined && b[k] !== "") {
          out[k] = b[k];
        } else if (Array.isArray(b[k])) {
          out[k] = b[k];
        }
      }
      return out;
    }
    window.SITE = mergeObj(base, fromDb);
  }

  /** 页面真正开始渲染 */
  function renderPage() {
    var page = document.body.getAttribute("data-page");
    var mod = ROUTES[page];
    if (!mod) return;
    try {
      mod.init();
    } catch (err) {
      if (window.console) console.error("[" + page + "] 页面渲染失败：", err);
      var box = document.createElement("div");
      box.className = "empty";
      box.style.margin = "30px auto";
      box.innerHTML = '<span class="empty__emoji">😵</span>页面出错了：' + esc(err.message);
      (document.querySelector("main .container") || document.body).prepend(box);
    }
  }

  function boot() {
    /* ------------------------------------------------------------------
       先做一次「文件有没有加载成功」的体检。
       如果 loader.js 都没跑起来（window.CONTENT 不存在），说明有文件 404 了 ——
       这种情况最常见的表现就是「页面一片空白」，所以立刻给出人话提示，不用傻等。
       ------------------------------------------------------------------ */
    if (!window.CONTENT) {
      var box = document.createElement("div");
      box.className = "empty";
      box.style.margin = "30px auto";
      box.innerHTML =
        '<span class="empty__emoji">📦</span>' +
        "<b>页面没有正常加载</b><br>" +
        "原因是网站的文件没找齐（有文件没上传成功，或者路径不对）。<br>" +
        "请按 <b>F12</b> 打开开发者工具，看 <b>Console</b> 或 <b>Network</b> 里红色的 404，" +
        "把对应的文件补上传上去，然后按 <b>Ctrl + F5</b> 强制刷新。";
      var boxHost = document.querySelector("main .container") || document.body;
      boxHost.prepend(box);
      /* 导航和页脚还是要画出来，不然整页看起来像坏掉了 */
      try { if (window.App && App.boot) App.boot(); } catch (e) { /* 忽略 */ }
      return;
    }

    /* 先把网站设置读回来（失败也没关系，用默认值继续） */
    var siteReady = window.Store
      ? window.Store.fetchSiteConfig().then(mergeSiteConfig).catch(function () {})
      : Promise.resolve();

    /* 兜底：如果 12 秒内数据还没回来（比如网络一直连不上数据库），
       也先把页面画出来，让你看到原因，而不是对着白屏发呆。 */
    var fallback = new Promise(function (resolve) {
      setTimeout(function () {
        if (C.state && C.state.loading) {
          C.state.loading = false;
          if (!C.state.message) {
            C.state.message =
              "数据加载超时。可能是网络连不上数据库，也可能是某个脚本文件没上传成功" +
              "（按 F12 看 Console 里红色的 404）。";
          }
        }
        resolve();
      }, 12000);
    });

    Promise.race([
      Promise.all([siteReady, C.ready]),
      fallback,
    ]).then(function () {
      /* 设置变了，导航栏和页脚要按新设置重画一遍 */
      try {
        if (window.App && App.boot) App.boot();
      } catch (e) {
        if (window.console) console.error("[小窝] 导航渲染失败：", e);
      }
      renderPage();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
