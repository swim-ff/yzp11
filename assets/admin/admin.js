/**
 * ============================================================================
 *  后台管理 · assets/admin/admin.js
 * ----------------------------------------------------------------------------
 *  这个文件只服务于 /admin.html（后台）。
 *
 *  它能做的事：
 *    · 登录（账号在 Supabase 后台创建，见《新手操作手册》第 3 步）
 *    · 写文章：左边写 markdown，右边实时预览，可以上传封面图
 *    · 发随笔、传相册照片、加友链、记更新日志
 *    · 看并删除读者留言
 *    · 改网站设置：站名、导航菜单、首页欢迎语、个人信息、关于我、页脚
 *
 *  【小白提示】你不需要看懂这个文件。照着页面上的字操作就行。
 *             万一哪里报错，页面上会显示中文提示，照着提示做即可。
 * ============================================================================
 */
(function () {
  "use strict";

  /* ==========================================================================
   * 0. 小工具
   * ======================================================================== */
  var U = window.UI;
  var A = window.App;
  var esc = function (s) { return U.escapeHTML(s); };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** 建一个元素 */
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  /** 屏幕上给用户看的提示 */
  function setMsg(node, text, bad) {
    if (!node) return;
    node.textContent = text || "";
    node.className = "adm-msg" + (bad ? " is-bad" : "");
  }

  /** 今天日期（YYYY-MM-DD） */
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** 自动生成一个不会重复的链接标识（slug） */
  function makeSlug() {
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    return "post-" + stamp + "-" + Math.random().toString(36).slice(2, 6);
  }

  /** 二次确认（避免手滑删掉东西） */
  function confirmDelete(what) {
    return window.confirm("确定要删除" + (what || "这条内容") + "吗？\n删掉之后就找不回来了。");
  }

  /* ==========================================================================
   * 1. 通用：可增可删的“列表编辑器”
   *    导航菜单、技能条、时间线、页脚链接、联系方式都用它，
   *    这样以后你想加新的一组东西，只要写一行字段定义就行。
   * ======================================================================== */

  /**
   * @param {Array} fields [{ key, label, placeholder, type }]
   * @param {Array} data   初始数据数组
   * @returns {object} { node, getData() }
   */
  function listEditor(fields, data) {
    var wrap = el("div", { class: "adm-nav-editor" });

    function addRow(item) {
      var row = el("div", { class: "adm-nav-row" });
      fields.forEach(function (f) {
        var input = el("input", {
          class: "field",
          type: f.type || "text",
          placeholder: f.placeholder || f.label,
          "data-key": f.key,
          "aria-label": f.label,
        });
        input.value = item && item[f.key] != null ? item[f.key] : "";
        row.appendChild(input);
      });
      var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
      del.addEventListener("click", function () { row.remove(); });
      row.appendChild(del);
      wrap.appendChild(row);
      return row;
    }

    (data && data.length ? data : [{}]).forEach(addRow);

    var addBtn = el("button", { class: "adm-mini adm-mini--good", type: "button", text: "＋ 添加一行" });
    addBtn.addEventListener("click", function () { addRow({}); });
    wrap.appendChild(addBtn);

    return {
      node: wrap,
      getData: function () {
        return $$(".adm-nav-row", wrap).map(function (row) {
          var obj = {};
          var empty = true;
          fields.forEach(function (f) {
            var input = $('[data-key="' + f.key + '"]', row);
            var val = input ? input.value.trim() : "";
            obj[f.key] = f.type === "number" ? Number(val) || 0 : val;
            if (val !== "" && val !== 0) empty = false;
          });
          return empty ? null : obj;
        }).filter(Boolean);
      },
    };
  }

  /* ==========================================================================
   * 2. 登录门
   * ======================================================================== */
  var Login = {
    render: function (host) {
      var self = this;
      host.innerHTML = "";

      var box = el("div", { class: "adm-login glass reveal" });
      box.innerHTML =
        '<div class="adm-login__logo">🏠</div>' +
        '<h1 class="adm-login__title">小窝后台</h1>' +
        '<p class="adm-login__desc">在这里写文章、传照片、改网站设置</p>';

      var f1 = el("div", { class: "adm-login__field" });
      f1.innerHTML = '<label class="field-label" for="admEmail">邮箱</label>';
      var email = el("input", { class: "field", id: "admEmail", type: "email", placeholder: "你注册后台账号用的邮箱", autocomplete: "username" });
      f1.appendChild(email);

      var f2 = el("div", { class: "adm-login__field" });
      f2.innerHTML = '<label class="field-label" for="admPass">密码</label>';
      var pass = el("input", { class: "field", id: "admPass", type: "password", placeholder: "密码", autocomplete: "current-password" });
      f2.appendChild(pass);

      var btn = el("button", { class: "btn btn--primary", type: "button", id: "admLoginBtn", text: "🔓 登录" });
      btn.style.width = "100%";
      btn.style.justifyContent = "center";

      var msg = el("p", { class: "adm-login__msg", id: "admLoginMsg" });

      var help = el("div", { class: "adm-login__help" });
      help.innerHTML =
        "<b>第一次用？</b>后台账号不需要注册，是我在 Supabase 里帮你建好的：<br>" +
        "① 打开 supabase.com 进你的项目 → 左侧 <b>Authentication</b> → <b>Users</b><br>" +
        "② 点右上角 <b>Add user</b> → <b>Create new user</b><br>" +
        "③ 填一个你自己的邮箱和密码，<b>记得勾上 Auto Confirm User</b>（不勾会要求收邮件确认）<br>" +
        "④ 回到这个页面，用刚才的邮箱密码登录<br>" +
        "详细截图说明看和网站放在一起的《新手操作手册.md》";

      box.appendChild(f1);
      box.appendChild(f2);
      box.appendChild(btn);
      box.appendChild(msg);
      box.appendChild(help);
      host.appendChild(box);

      function submit() {
        var e = email.value.trim();
        var p = pass.value;
        if (!e || !p) return setMsg(msg, "邮箱和密码都要填哦", true);

        btn.disabled = true;
        btn.textContent = "登录中…";
        setMsg(msg, "");

        window.Store.signIn(e, p)
          .then(function (user) {
            setMsg(msg, "登录成功，正在进入后台…", false);
            Dashboard.start(user);
          })
          .catch(function (err) {
            setMsg(msg, err.message, true);
            btn.disabled = false;
            btn.textContent = "🔓 登录";
          });
      }

      btn.addEventListener("click", submit);
      pass.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
      email.addEventListener("keydown", function (e) { if (e.key === "Enter") pass.focus(); });

      A.observeReveal(host);
    },
  };

  /* ==========================================================================
   * 3. 后台主体
   * ======================================================================== */
  var TABS = [
    { key: "posts", label: "📝 博文" },
    { key: "notes", label: "🍃 随笔" },
    { key: "gallery", label: "🖼️ 相册" },
    { key: "logs", label: "🗓️ 更新日志" },
    { key: "comments", label: "💬 留言" },
    { key: "friends", label: "🔗 友链" },
    { key: "settings", label: "⚙️ 网站设置" },
  ];

  var Dashboard = {
    current: "posts",
    loaded: {},     // 记录哪些标签页已经加载过

    start: function (user) {
      var host = document.getElementById("adminApp");
      host.innerHTML = "";
      host.appendChild(this.topbar(user));
      host.appendChild(this.tabBar());

      /* 每个标签页一个容器，切换到哪个就显示哪个 */
      var self = this;
      TABS.forEach(function (t) {
        var panel = el("section", { class: "adm-panel", "data-panel": t.key });
        host.appendChild(panel);
      });

      this.switchTab("posts");
    },

    topbar: function (user) {
      var bar = el("div", { class: "adm-topbar glass" });
      var st = (window.CONTENT && window.CONTENT.state) || {};
      var dotCls = st.ok ? "adm-dot adm-dot--ok" : "adm-dot adm-dot--bad";
      var dotText = st.ok ? "数据库已连接" : (st.configured ? "数据库读取出错" : "还没连接数据库");

      bar.innerHTML =
        '<h2 class="adm-topbar__title">🏠 小窝后台</h2>' +
        '<span class="' + dotCls + '"><i></i>' + esc(dotText) + "</span>" +
        '<span class="adm-dot"><i></i>' + esc((user && user.email) || "已登录") + "</span>" +
        '<span class="adm-topbar__spacer"></span>';

      var view = el("a", { class: "btn", href: "index.html", text: "🏡 看看网站" });
      var out = el("button", { class: "btn", type: "button", text: "退出登录" });
      out.addEventListener("click", function () {
        window.Store.signOut().then(function () { window.location.reload(); });
      });
      bar.appendChild(view);
      bar.appendChild(out);

      if (!st.ok) {
        var warn = el("p", { class: "adm-hint" });
        warn.style.gridColumn = "1 / -1";
        warn.style.marginTop = "10px";
        warn.style.color = "#c2506f";
        warn.textContent = "⚠️ " + (st.message || "数据库还没连接好，下面的内容可能加载不出来。");
        bar.appendChild(warn);
      }
      return bar;
    },

    tabBar: function () {
      var self = this;
      var bar = el("nav", { class: "adm-tabs", "aria-label": "后台功能" });
      TABS.forEach(function (t) {
        var b = el("button", { class: "adm-tab", type: "button", "data-tab": t.key, text: t.label });
        b.addEventListener("click", function () { self.switchTab(t.key); });
        bar.appendChild(b);
      });
      return bar;
    },

    switchTab: function (key) {
      this.current = key;
      $$(".adm-tab").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-tab") === key);
      });
      $$(".adm-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-panel") === key);
      });

      var panel = $('.adm-panel[data-panel="' + key + '"]');
      if (!panel) return;

      /* 第一次打开某个标签才去数据库取数据（省流量、打开更快） */
      if (!this.loaded[key]) {
        this.loaded[key] = true;
        var mod = PANELS[key];
        if (mod) mod.render(panel);
      }
      A.observeReveal(panel);
    },

    /** 别的地方（比如设置页）改了数据后，让某个标签页重新加载 */
    reload: function (key) {
      this.loaded[key] = false;
      if (this.current === key) {
        this.loaded[key] = true;
        var panel = $('.adm-panel[data-panel="' + key + '"]');
        if (panel && PANELS[key]) PANELS[key].render(panel);
      }
    },
  };

  /* ==========================================================================
   * 4. 面板：博文
   * ======================================================================== */
  var Panels = {};

  Panels.posts = {
    editingId: null,     // 正在编辑哪一篇（null = 新文章）
    coverArt: "grass",   // 当前选中的封面插画
    coverSrc: "",        // 自己上传/填写的封面图

    render: function (panel) {
      var self = this;
      panel.innerHTML = "";

      var split = el("div", { class: "adm-split" });

      /* ---------- 左边：文章列表 ---------- */
      var listCard = el("div", { class: "adm-card glass reveal" });
      listCard.innerHTML =
        '<div class="adm-card__head"><h3>📚 我的文章</h3><span class="spacer"></span>' +
        '<button class="adm-mini adm-mini--good" type="button" id="postNew">＋ 写新文章</button></div>' +
        '<div class="adm-list" id="postList"><p class="adm-hint">加载中…</p></div>';
      split.appendChild(listCard);

      /* ---------- 右边：编辑器 ---------- */
      var editCard = el("div", { class: "adm-card glass reveal" });
      editCard.innerHTML = this.formHTML();
      split.appendChild(editCard);

      panel.appendChild(split);

      /* ---------- 绑定事件 ---------- */
      this.listHost = $("#postList", listCard);
      this.editHost = editCard;
      this.msg = $("#postMsg", editCard);

      $("#postNew", panel).addEventListener("click", function () { self.resetForm(); });
      this.bindForm(editCard);
      this.loadList();
    },

    /** 编辑器的 HTML */
    formHTML: function () {
      return (
        '<div class="adm-card__head"><h3 id="postFormTitle">✍️ 写新文章</h3></div>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="pTitle">标题 <span style="color:#ef8fae">*</span></label>' +
            '<input class="field" id="pTitle" type="text" placeholder="例如：我的第一次 Linux 实验"></div>' +
          '<div><label class="field-label" for="pDate">发布日期</label>' +
            '<input class="field" id="pDate" type="date" value="' + today() + '"></div>' +
        "</div>" +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="pCategory">分类</label>' +
            '<input class="field" id="pCategory" type="text" placeholder="例如：学习笔记 / CTF / 前端"></div>' +
          '<div><label class="field-label" for="pTags">标签（用逗号分开）</label>' +
            '<input class="field" id="pTags" type="text" placeholder="例如：Python, 入门"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="pExcerpt">简介（显示在卡片上，不填会自动截取正文开头）</label>' +
          '<textarea class="field" id="pExcerpt" style="min-height:64px" placeholder="一句话介绍这篇文章"></textarea></div>' +

        /* 封面 */
        '<div class="adm-field"><label class="field-label">封面</label>' +
          '<div class="adm-arts" id="pArts"></div>' +
          '<div class="adm-upload" style="margin-top:10px">' +
            '<span>或者用你自己的图片：</span>' +
            '<input type="file" id="pCoverFile" accept="image/*">' +
            '<span class="adm-hint" style="margin:0">上传后会填到下面的输入框里</span>' +
          "</div>" +
          '<input class="field" id="pCoverSrc" type="text" style="margin-top:10px" placeholder="图片地址（上传后自动填，也可以粘贴网上的图片链接）">' +
          '<div class="adm-thumb" id="pCoverPreview" style="display:none"><img alt="封面预览"></div>' +
        "</div>" +

        /* 正文 */
        '<div class="adm-field"><label class="field-label">正文（markdown 格式，右边会实时显示效果）</label>' +
          '<div class="adm-toolbar">' +
            '<button class="adm-mini" type="button" data-md="h2">大标题</button>' +
            '<button class="adm-mini" type="button" data-md="h3">小标题</button>' +
            '<button class="adm-mini" type="button" data-md="bold">粗体</button>' +
            '<button class="adm-mini" type="button" data-md="code">代码块</button>' +
            '<button class="adm-mini" type="button" data-md="list">列表</button>' +
            '<button class="adm-mini" type="button" data-md="quote">引用</button>' +
            '<button class="adm-mini" type="button" data-md="table">表格</button>' +
            '<button class="adm-mini" type="button" data-md="img">插入图片</button>' +
            '<button class="adm-mini" type="button" data-md="link">插入链接</button>' +
          "</div>" +
          '<div class="adm-editor">' +
            '<textarea class="field" id="pContent" placeholder="## 小标题&#10;&#10;正文直接写就行…"></textarea>' +
            '<div class="adm-preview md-body" id="pPreview"></div>' +
          "</div>" +
        "</div>" +

        '<div class="adm-actions">' +
          '<button class="btn btn--primary" type="button" id="pSave">💾 保存文章</button>' +
          '<button class="btn" type="button" id="pPreviewBtn">👀 打开预览页</button>' +
          '<button class="btn" type="button" id="pClear">🧹 清空表单</button>' +
          '<span class="spacer"></span>' +
          '<span class="adm-hint" style="margin:0">保存后刷新网站首页就能看到</span>' +
        "</div>" +
        '<p class="adm-msg" id="postMsg"></p>'
      );
    },

    /** 绑定编辑器里的所有交互 */
    bindForm: function (card) {
      var self = this;

      /* --- 封面插画选择器 --- */
      var arts = $("#pArts", card);
      U.THEME_NAMES.forEach(function (name) {
        var a = el("div", { class: "adm-art", "data-art": name, title: name });
        a.innerHTML = '<img src="' + U.artDataURI(name, { w: 200, h: 120, seed: name }) + '" alt="' + name + '">' +
          "<span>" + name + "</span>";
        a.addEventListener("click", function () {
          self.coverArt = name;
          self.coverSrc = "";
          $("#pCoverSrc", card).value = "";
          self.markArt(card);
          self.updateCoverPreview(card);
        });
        arts.appendChild(a);
      });
      this.markArt(card);

      /* --- 上传封面图 --- */
      $("#pCoverFile", card).addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var m = self.msg;
        setMsg(m, "正在上传图片…");
        window.Store.uploadImage(file, "covers")
          .then(function (url) {
            $("#pCoverSrc", card).value = url;
            self.coverSrc = url;
            self.updateCoverPreview(card);
            setMsg(m, "✅ 封面图上传成功");
          })
          .catch(function (err) { setMsg(m, "❌ " + err.message, true); });
      });

      /* --- 手动填图片地址时同步预览 --- */
      $("#pCoverSrc", card).addEventListener("input", function (e) {
        self.coverSrc = e.target.value.trim();
        self.updateCoverPreview(card);
      });

      /* --- markdown 工具栏 --- */
      var content = $("#pContent", card);
      function insert(before, after, placeholder) {
        var start = content.selectionStart;
        var end = content.selectionEnd;
        var selected = content.value.slice(start, end) || placeholder || "";
        var text = before + selected + (after || "");
        content.value = content.value.slice(0, start) + text + content.value.slice(end);
        content.focus();
        content.selectionStart = start + before.length;
        content.selectionEnd = start + before.length + selected.length;
        self.updatePreview(card);
      }
      var MD_TOOLS = {
        h2: function () { insert("## ", "\n", "小标题"); },
        h3: function () { insert("### ", "\n", "更小的标题"); },
        bold: function () { insert("**", "**", "加粗的字"); },
        code: function () { insert("\n```python\n", "\n```\n", 'print("hello")'); },
        list: function () { insert("- ", "\n", "第一条"); },
        quote: function () { insert("> ", "\n", "引用的话"); },
        table: function () {
          insert("\n| 表头 | 说明 |\n| --- | --- |\n| 内容 | 内容 |\n", "", "");
        },
        img: function () {
          /* 直接选图片上传，上传完自动插入 markdown 图片语法 */
          var input = el("input", { type: "file", accept: "image/*" });
          input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;
            setMsg(self.msg, "正在上传图片…");
            window.Store.uploadImage(file, "posts")
              .then(function (url) {
                insert("\n![](" + url + ")\n", "", "");
                setMsg(self.msg, "✅ 图片已插入正文");
              })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          input.click();
        },
        link: function () { insert("[链接文字](", ")", "https://example.com"); },
      };
      $$("[data-md]", card).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var fn = MD_TOOLS[btn.getAttribute("data-md")];
          if (fn) fn();
        });
      });

      /* --- 实时预览（打字停顿 220ms 后才渲染，避免卡顿） --- */
      content.addEventListener("input", U.debounce(function () { self.updatePreview(card); }, 220));
      this.updatePreview(card);

      /* --- 保存 / 清空 / 预览 --- */
      $("#pSave", card).addEventListener("click", function () { self.save(card); });
      $("#pClear", card).addEventListener("click", function () {
        if (self.editingId && !window.confirm("清空表单会取消当前的编辑（数据库里的文章不会被删），继续？")) return;
        self.resetForm();
      });
      $("#pPreviewBtn", card).addEventListener("click", function () {
        var slug = self.editingSlug;
        if (!slug) return setMsg(self.msg, "先保存一次，才能打开预览页", true);
        window.open("post.html?p=" + encodeURIComponent(slug), "_blank");
      });
    },

    /** 让选中的封面插画高亮 */
    markArt: function (card) {
      var self = this;
      $$(".adm-art", card).forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-art") === self.coverArt && !self.coverSrc);
      });
    },

    /** 更新封面预览小图 */
    updateCoverPreview: function (card) {
      var box = $("#pCoverPreview", card);
      var src = this.coverSrc || U.artDataURI(this.coverArt, { w: 400, h: 240 });
      $("img", box).src = src;
      box.style.display = "";
      this.markArt(card);
    },

    /** 右侧实时预览 */
    updatePreview: function (card) {
      var host = $("#pPreview", card);
      var text = $("#pContent", card).value;
      if (!text.trim()) {
        host.innerHTML = '<p class="adm-hint">左边写内容，这里会实时显示效果。</p>';
        return;
      }
      host.innerHTML = window.MD.render(text);
    },

    /** 清空表单（准备写新文章） */
    resetForm: function () {
      var card = this.editHost;
      this.editingId = null;
      this.editingSlug = null;
      this.coverArt = "grass";
      this.coverSrc = "";

      $("#postFormTitle", card).textContent = "✍️ 写新文章";
      $("#pTitle", card).value = "";
      $("#pDate", card).value = today();
      $("#pCategory", card).value = "";
      $("#pTags", card).value = "";
      $("#pExcerpt", card).value = "";
      $("#pCoverSrc", card).value = "";
      $("#pContent", card).value = "";
      setMsg(this.msg, "");
      this.updateCoverPreview(card);
      this.updatePreview(card);
      this.loadList();
    },

    /** 把一篇文章读进表单 */
    fillForm: function (row) {
      var card = this.editHost;
      this.editingId = row.id;
      this.editingSlug = row.slug;
      this.coverSrc = row.cover_src || "";
      this.coverArt = row.cover_art || "grass";

      $("#postFormTitle", card).textContent = "✏️ 正在修改：" + row.title;
      $("#pTitle", card).value = row.title || "";
      $("#pDate", card).value = String(row.date || "").slice(0, 10);
      $("#pCategory", card).value = row.category || "";
      $("#pTags", card).value = (row.tags || []).join(", ");
      $("#pExcerpt", card).value = row.excerpt || "";
      $("#pCoverSrc", card).value = this.coverSrc;
      $("#pContent", card).value = row.content || "";
      setMsg(this.msg, "正在修改这篇文章，改完点「保存文章」。");
      this.updateCoverPreview(card);
      this.updatePreview(card);
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    },

    /** 保存（新增或修改） */
    save: function (card) {
      var self = this;
      var title = $("#pTitle", card).value.trim();
      var content = $("#pContent", card).value;
      var date = $("#pDate", card).value || today();

      if (!title) return setMsg(this.msg, "❌ 标题不能空着", true);
      if (!content.trim()) return setMsg(this.msg, "❌ 正文还不能是空的，随便写两句也行", true);

      var tags = $("#pTags", card).value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var row = {
        title: title,
        date: date,
        category: $("#pCategory", card).value.trim() || "未分类",
        tags: tags,
        excerpt: $("#pExcerpt", card).value.trim(),
        cover_art: this.coverArt || "grass",
        cover_src: $("#pCoverSrc", card).value.trim() || null,
        content: content,
      };

      var btn = $("#pSave", card);
      btn.disabled = true;
      btn.textContent = "保存中…";

      var promise;
      if (this.editingId) {
        promise = window.Store.update("posts", this.editingId, row);
      } else {
        row.slug = makeSlug();
        row.published = true;
        promise = window.Store.insert("posts", row);
      }

      promise
        .then(function () {
          btn.disabled = false;
          btn.textContent = "💾 保存文章";
          setMsg(self.msg, self.editingId ? "✅ 修改成功，刷新网站就能看到" : "✅ 发布成功！刷新网站首页就能看到这篇文章");
          if (!self.editingId && row.slug) self.editingSlug = row.slug;
          self.editingId = null;
          self.loadList();
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = "💾 保存文章";
          setMsg(self.msg, "❌ " + err.message, true);
        });
    },

    /** 加载文章列表 */
    loadList: function () {
      var self = this;
      var host = this.listHost;
      if (!host) return;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';

      window.Store.getClient().then(function (sb) {
        return sb.from("posts")
          .select("id,slug,title,date,category,tags,excerpt,cover_art,cover_src,content,published,views")
          .order("date", { ascending: false });
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">还没有文章。右边写一篇，点「保存文章」就发布了 🎉</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var thumb = r.cover_src
            ? '<img src="' + U.escapeAttr(r.cover_src) + '" alt="">'
            : '<img src="' + U.artDataURI(r.cover_art || "grass", { w: 100, h: 100 }) + '" alt="">';

          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">' + thumb + "</div>" +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(r.title) + "</div>" +
              '<div class="adm-item__meta">' +
                "<span>🗓 " + esc(String(r.date).slice(0, 10)) + "</span>" +
                "<span>🏷 " + esc(r.category || "未分类") + "</span>" +
                "<span>👀 " + (r.views || 0) + "</span>" +
                "<span>✍️ " + U.countWords(r.content || "") + " 字</span>" +
              "</div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';

          var ops = $(".adm-item__ops", item);
          var edit = el("button", { class: "adm-mini", type: "button", text: "编辑" });
          edit.addEventListener("click", function () { self.fillForm(r); });
          var view = el("a", { class: "adm-mini", href: "post.html?p=" + encodeURIComponent(r.slug), target: "_blank", text: "查看" });
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("《" + r.title + "》")) return;
            window.Store.remove("posts", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          ops.appendChild(edit);
          ops.appendChild(view);
          ops.appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 5. 面板：随笔
   * ======================================================================== */
  Panels.notes = {
    render: function (panel) {
      var self = this;
      panel.innerHTML = "";

      var split = el("div", { class: "adm-split" });

      var listCard = el("div", { class: "adm-card glass reveal" });
      listCard.innerHTML = '<div class="adm-card__head"><h3>🍃 我的随笔</h3></div>' +
        '<div class="adm-list" id="noteList"><p class="adm-hint">加载中…</p></div>';
      split.appendChild(listCard);

      var formCard = el("div", { class: "adm-card glass reveal" });
      formCard.innerHTML =
        '<div class="adm-card__head"><h3>✍️ 发一条随笔</h3></div>' +
        '<p class="adm-hint">随笔就是短句子：今天学了什么、踩了什么坑、心情怎么样。像发朋友圈一样写就行。</p>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="nDate">日期</label>' +
            '<input class="field" id="nDate" type="date" value="' + today() + '"></div>' +
          '<div><label class="field-label" for="nMood">心情标签（可不填）</label>' +
            '<input class="field" id="nMood" type="text" placeholder="例如：开心 / 踩坑了 / 累了"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="nText">内容 <span style="color:#ef8fae">*</span></label>' +
          '<textarea class="field" id="nText" placeholder="今天…"></textarea></div>' +
        '<div class="adm-upload">' +
          "<span>配图（可不传，最多 3 张）：</span>" +
          '<input type="file" id="nImages" accept="image/*" multiple>' +
        "</div>" +
        '<div class="adm-thumb-row" id="nThumbs" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"></div>' +
        '<div class="adm-actions"><button class="btn btn--primary" type="button" id="nSave">🚀 发布随笔</button>' +
          '<button class="btn" type="button" id="nClear">🧹 清空</button></div>' +
        '<p class="adm-msg" id="noteMsg"></p>';
      split.appendChild(formCard);
      panel.appendChild(split);

      this.listHost = $("#noteList", listCard);
      this.msg = $("#noteMsg", formCard);
      this.images = [];

      $("#nImages", formCard).addEventListener("change", function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        if (!files.length) return;
        var thumbs = $("#nThumbs", formCard);
        setMsg(self.msg, "正在上传 " + files.length + " 张图片…");
        var jobs = files.slice(0, 3).map(function (f) { return window.Store.uploadImage(f, "notes"); });
        Promise.all(jobs).then(function (urls) {
          self.images = self.images.concat(urls);
          urls.forEach(function (u) {
            var t = el("div", { class: "adm-thumb", style: "width:70px" });
            t.innerHTML = '<img src="' + U.escapeAttr(u) + '" alt="">';
            thumbs.appendChild(t);
          });
          setMsg(self.msg, "✅ 图片上传成功（共 " + self.images.length + " 张）");
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      function reset() {
        $("#nText", formCard).value = "";
        $("#nMood", formCard).value = "";
        $("#nDate", formCard).value = today();
        $("#nThumbs", formCard).innerHTML = "";
        self.images = [];
        setMsg(self.msg, "");
      }
      $("#nClear", formCard).addEventListener("click", reset);

      $("#nSave", formCard).addEventListener("click", function () {
        var text = $("#nText", formCard).value.trim();
        if (!text) return setMsg(self.msg, "❌ 内容不能空着", true);
        var btn = $("#nSave", formCard);
        btn.disabled = true;
        btn.textContent = "发布中…";

        window.Store.insert("notes", {
          date: $("#nDate", formCard).value || today(),
          mood: $("#nMood", formCard).value.trim(),
          text: text,
          images: self.images.map(function (u) { return { src: u }; }),
        }).then(function () {
          btn.disabled = false;
          btn.textContent = "🚀 发布随笔";
          setMsg(self.msg, "✅ 发布成功！刷新「随笔」页面就能看到");
          reset();
          self.loadList();
        }).catch(function (err) {
          btn.disabled = false;
          btn.textContent = "🚀 发布随笔";
          setMsg(self.msg, "❌ " + err.message, true);
        });
      });

      this.loadList();
    },

    loadList: function () {
      var self = this;
      var host = this.listHost;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';
      window.Store.getClient().then(function (sb) {
        return sb.from("notes").select("id,date,mood,text,images").order("date", { ascending: false });
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">还没有随笔，右边写一条吧～</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">🍃</div>' +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(String(r.text).slice(0, 40)) + (String(r.text).length > 40 ? "…" : "") + "</div>" +
              '<div class="adm-item__meta"><span>🗓 ' + esc(String(r.date).slice(0, 10)) + "</span>" +
                (r.mood ? "<span>😊 " + esc(r.mood) + "</span>" : "") +
                "<span>🖼 " + ((r.images || []).length) + "</span></div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("这条随笔")) return;
            window.Store.remove("notes", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          $(".adm-item__ops", item).appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 6. 面板：相册
   * ======================================================================== */
  Panels.gallery = {
    render: function (panel) {
      var self = this;
      panel.innerHTML = "";

      var split = el("div", { class: "adm-split" });

      var listCard = el("div", { class: "adm-card glass reveal" });
      listCard.innerHTML = '<div class="adm-card__head"><h3>🖼️ 相册</h3></div>' +
        '<div class="adm-list" id="galList"><p class="adm-hint">加载中…</p></div>';
      split.appendChild(listCard);

      var formCard = el("div", { class: "adm-card glass reveal" });
      formCard.innerHTML =
        '<div class="adm-card__head"><h3>⬆️ 上传照片</h3></div>' +
        '<p class="adm-hint">选一张照片（建议 5MB 以内），填上标题和说明，点上传就出现在相册里了。</p>' +
        '<div class="adm-upload"><input type="file" id="gFile" accept="image/*"></div>' +
        '<div class="adm-thumb" id="gThumb" style="display:none"><img alt="预览"></div>' +
        '<div class="adm-row" style="margin-top:12px">' +
          '<div><label class="field-label" for="gTitle">标题 <span style="color:#ef8fae">*</span></label>' +
            '<input class="field" id="gTitle" type="text" placeholder="例如：雨后的操场"></div>' +
          '<div><label class="field-label" for="gDate">日期</label>' +
            '<input class="field" id="gDate" type="date" value="' + today() + '"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="gDesc">图片说明（可不填）</label>' +
          '<input class="field" id="gDesc" type="text" placeholder="例如：下午四点，刚下过雨"></div>' +
        '<div class="adm-actions"><button class="btn btn--primary" type="button" id="gSave">⬆️ 上传并保存</button></div>' +
        '<p class="adm-msg" id="galMsg"></p>';
      split.appendChild(formCard);
      panel.appendChild(split);

      this.listHost = $("#galList", listCard);
      this.msg = $("#galMsg", formCard);
      this.url = "";

      $("#gFile", formCard).addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setMsg(self.msg, "正在上传…");
        window.Store.uploadImage(file, "gallery").then(function (url) {
          self.url = url;
          var box = $("#gThumb", formCard);
          $("img", box).src = url;
          box.style.display = "";
          setMsg(self.msg, "✅ 图片已上传，填好标题后点下面的按钮");
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      $("#gSave", formCard).addEventListener("click", function () {
        if (!self.url) return setMsg(self.msg, "❌ 先选一张图片", true);
        var title = $("#gTitle", formCard).value.trim();
        if (!title) return setMsg(self.msg, "❌ 给照片起个标题吧", true);

        window.Store.insert("gallery", {
          title: title,
          date: $("#gDate", formCard).value || today(),
          src: self.url,
          description: $("#gDesc", formCard).value.trim(),
        }).then(function () {
          setMsg(self.msg, "✅ 已加入相册！刷新「相册」页面就能看到");
          self.url = "";
          $("#gFile", formCard).value = "";
          $("#gTitle", formCard).value = "";
          $("#gDesc", formCard).value = "";
          $("#gThumb", formCard).style.display = "none";
          self.loadList();
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      this.loadList();
    },

    loadList: function () {
      var self = this;
      var host = this.listHost;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';
      window.Store.getClient().then(function (sb) {
        return sb.from("gallery").select("id,title,date,src,art,description").order("date", { ascending: false });
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">相册还是空的，右边传第一张照片吧～</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var thumb = r.src ? '<img src="' + U.escapeAttr(r.src) + '" alt="">' : "🖼️";
          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">' + thumb + "</div>" +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(r.title) + "</div>" +
              '<div class="adm-item__meta"><span>🗓 ' + esc(String(r.date).slice(0, 10)) + "</span>" +
                (r.description ? "<span>" + esc(r.description) + "</span>" : "") + "</div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("这张照片（相册里的记录，图片文件还在仓库里）")) return;
            window.Store.remove("gallery", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          $(".adm-item__ops", item).appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 7. 面板：更新日志
   * ======================================================================== */
  Panels.logs = {
    render: function (panel) {
      var self = this;
      panel.innerHTML = "";

      var split = el("div", { class: "adm-split" });

      var listCard = el("div", { class: "adm-card glass reveal" });
      listCard.innerHTML = '<div class="adm-card__head"><h3>🗓️ 更新记录</h3></div>' +
        '<div class="adm-list" id="logList"><p class="adm-hint">加载中…</p></div>';
      split.appendChild(listCard);

      var formCard = el("div", { class: "adm-card glass reveal" });
      formCard.innerHTML =
        '<div class="adm-card__head"><h3>✍️ 记一条更新</h3></div>' +
        '<p class="adm-hint">比如「v1.1 加了评论区」「换了新头像」。每行一条，格式：类型 | 内容。</p>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="lVersion">版本号 <span style="color:#ef8fae">*</span></label>' +
            '<input class="field" id="lVersion" type="text" placeholder="例如：v1.1"></div>' +
          '<div><label class="field-label" for="lDate">日期</label>' +
            '<input class="field" id="lDate" type="date" value="' + today() + '"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="lTitle">这次更新的主题</label>' +
          '<input class="field" id="lTitle" type="text" placeholder="例如：加了评论区"></div>' +
        '<div class="adm-field"><label class="field-label" for="lItems">具体内容（一行一条）</label>' +
          '<textarea class="field" id="lItems" style="min-height:120px" placeholder="新增 | 文章底部可以评论了&#10;优化 | 手机上看文章更舒服了&#10;修复 | 图片偶尔显示不出来的问题"></textarea></div>' +
        '<p class="adm-hint">类型可以写：新增 / 优化 / 修复 / 文档 / 样式 / 安全（写别的也行，只是颜色会默认）</p>' +
        '<div class="adm-actions"><button class="btn btn--primary" type="button" id="lSave">🚀 发布这条记录</button></div>' +
        '<p class="adm-msg" id="logMsg"></p>';
      split.appendChild(formCard);
      panel.appendChild(split);

      this.listHost = $("#logList", listCard);
      this.msg = $("#logMsg", formCard);

      $("#lSave", formCard).addEventListener("click", function () {
        var version = $("#lVersion", formCard).value.trim();
        if (!version) return setMsg(self.msg, "❌ 版本号不能空着，随便写个 v1.0 也行", true);

        var items = $("#lItems", formCard).value.split("\n").map(function (line) {
          var t = line.trim();
          if (!t) return null;
          var parts = t.split("|");
          if (parts.length >= 2) {
            return { type: parts[0].trim(), text: parts.slice(1).join("|").trim() };
          }
          return { type: "其他", text: t };
        }).filter(Boolean);

        if (!items.length) return setMsg(self.msg, "❌ 至少写一条具体内容", true);

        window.Store.insert("logs", {
          version: version,
          date: $("#lDate", formCard).value || today(),
          title: $("#lTitle", formCard).value.trim(),
          items: items,
        }).then(function () {
          setMsg(self.msg, "✅ 发布成功！刷新「日志」页面就能看到");
          $("#lVersion", formCard).value = "";
          $("#lTitle", formCard).value = "";
          $("#lItems", formCard).value = "";
          self.loadList();
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      this.loadList();
    },

    loadList: function () {
      var self = this;
      var host = this.listHost;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';
      window.Store.getClient().then(function (sb) {
        return sb.from("logs").select("id,version,date,title,items").order("date", { ascending: false });
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">还没有更新记录，右边记一条吧～</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">🗓️</div>' +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(r.version) + (r.title ? " · " + esc(r.title) : "") + "</div>" +
              '<div class="adm-item__meta"><span>🗓 ' + esc(String(r.date).slice(0, 10)) + "</span>" +
                "<span>📋 " + ((r.items || []).length) + " 条</span></div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("这条更新记录")) return;
            window.Store.remove("logs", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          $(".adm-item__ops", item).appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 8. 面板：留言
   * ======================================================================== */
  Panels.comments = {
    render: function (panel) {
      var self = this;
      panel.innerHTML = "";
      var card = el("div", { class: "adm-card glass reveal adm-card--wide" });
      card.innerHTML =
        '<div class="adm-card__head"><h3>💬 读者的留言和评论</h3><span class="spacer"></span>' +
        '<span class="adm-hint" style="margin:0" id="cmCount"></span></div>' +
        '<p class="adm-hint">留言板的内容和每篇文章下面的评论都会出现在这里。看不顺眼的可以直接删掉。</p>' +
        '<div class="adm-list" id="cmList"><p class="adm-hint">加载中…</p></div>' +
        '<p class="adm-msg" id="cmMsg"></p>';
      panel.appendChild(card);

      this.listHost = $("#cmList", card);
      this.msg = $("#cmMsg", card);
      this.loadList();
    },

    loadList: function () {
      var self = this;
      var host = this.listHost;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';

      window.Store.getClient().then(function (sb) {
        return sb.from("comments")
          .select("id,post_slug,name,text,created_at,approved")
          .order("created_at", { ascending: false })
          .limit(300);
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        $("#cmCount").textContent = rows.length ? "共 " + rows.length + " 条" : "";
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">还没有人留言。等有人来了这里就会出现～</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var where = r.post_slug === "guestbook"
            ? "留言板"
            : "文章：" + r.post_slug;
          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">' + esc(String(r.name || "匿").charAt(0)) + "</div>" +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(r.name) + "：" + esc(String(r.text).slice(0, 50)) +
                (String(r.text).length > 50 ? "…" : "") + "</div>" +
              '<div class="adm-item__meta">' +
                "<span>📍 " + esc(where) + "</span>" +
                "<span>🕐 " + esc(String(r.created_at).replace("T", " ").slice(0, 16)) + "</span>" +
              "</div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("这条留言")) return;
            window.Store.remove("comments", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          $(".adm-item__ops", item).appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 9. 面板：友链
   * ======================================================================== */
  Panels.friends = {
    render: function (panel) {
      var self = this;
      panel.innerHTML = "";

      var split = el("div", { class: "adm-split" });

      var listCard = el("div", { class: "adm-card glass reveal" });
      listCard.innerHTML = '<div class="adm-card__head"><h3>🔗 友链</h3></div>' +
        '<div class="adm-list" id="frList"><p class="adm-hint">加载中…</p></div>';
      split.appendChild(listCard);

      var formCard = el("div", { class: "adm-card glass reveal" });
      formCard.innerHTML =
        '<div class="adm-card__head"><h3>➕ 添加友链</h3></div>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="fName">站点名称 <span style="color:#ef8fae">*</span></label>' +
            '<input class="field" id="fName" type="text" placeholder="例如：小明的博客"></div>' +
          '<div><label class="field-label" for="fUrl">站点地址 <span style="color:#ef8fae">*</span></label>' +
            '<input class="field" id="fUrl" type="text" placeholder="https://example.com"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="fDesc">一句话简介</label>' +
          '<input class="field" id="fDesc" type="text" placeholder="例如：一个爱写代码的大学生"></div>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="fAvatar">头像图片地址（可不填）</label>' +
            '<input class="field" id="fAvatar" type="text" placeholder="https://example.com/avatar.png"></div>' +
          '<div><label class="field-label" for="fColor">头像是图片时，这里填的底色</label>' +
            '<select class="field" id="fColor">' +
              '<option value="sakura">樱粉</option><option value="sky">天空蓝</option>' +
              '<option value="matcha">抹茶绿</option><option value="cream">奶油黄</option>' +
              '<option value="sun">暖阳</option><option value="lilac">薰衣草</option>' +
            "</select></div>" +
        "</div>" +
        '<div class="adm-upload"><span>或者直接上传对方的头像：</span><input type="file" id="fFile" accept="image/*"></div>' +
        '<div class="adm-actions"><button class="btn btn--primary" type="button" id="fSave">➕ 添加</button></div>' +
        '<p class="adm-msg" id="frMsg"></p>';
      split.appendChild(formCard);
      panel.appendChild(split);

      this.listHost = $("#frList", listCard);
      this.msg = $("#frMsg", formCard);

      $("#fFile", formCard).addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setMsg(self.msg, "正在上传头像…");
        window.Store.uploadImage(file, "friends").then(function (url) {
          $("#fAvatar", formCard).value = url;
          setMsg(self.msg, "✅ 头像已上传");
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      $("#fSave", formCard).addEventListener("click", function () {
        var name = $("#fName", formCard).value.trim();
        var url = $("#fUrl", formCard).value.trim();
        if (!name) return setMsg(self.msg, "❌ 站点名称不能空着", true);
        if (!url) return setMsg(self.msg, "❌ 站点地址不能空着", true);
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;

        window.Store.insert("friends", {
          name: name,
          url: url,
          description: $("#fDesc", formCard).value.trim(),
          avatar: $("#fAvatar", formCard).value.trim(),
          color: $("#fColor", formCard).value,
        }).then(function () {
          setMsg(self.msg, "✅ 添加成功！刷新「友链」页面就能看到");
          $("#fName", formCard).value = "";
          $("#fUrl", formCard).value = "";
          $("#fDesc", formCard).value = "";
          $("#fAvatar", formCard).value = "";
          self.loadList();
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      this.loadList();
    },

    loadList: function () {
      var self = this;
      var host = this.listHost;
      host.innerHTML = '<p class="adm-hint">加载中…</p>';
      window.Store.getClient().then(function (sb) {
        return sb.from("friends").select("id,name,url,description,avatar,color").order("created_at", { ascending: true });
      }).then(function (res) {
        if (res.error) throw new Error(window.Store.humanError(res.error));
        var rows = res.data || [];
        if (!rows.length) {
          host.innerHTML = '<p class="adm-hint">还没有友链，右边加一个吧～</p>';
          return;
        }
        host.innerHTML = "";
        rows.forEach(function (r) {
          var thumb = r.avatar ? '<img src="' + U.escapeAttr(r.avatar) + '" alt="">' : esc(String(r.name).charAt(0));
          var item = el("div", { class: "adm-item" });
          item.innerHTML =
            '<div class="adm-item__thumb">' + thumb + "</div>" +
            '<div class="adm-item__main">' +
              '<div class="adm-item__title">' + esc(r.name) + "</div>" +
              '<div class="adm-item__meta"><span>' + esc(String(r.url).replace(/^https?:\/\//, "")) + "</span>" +
                (r.description ? "<span>" + esc(r.description) + "</span>" : "") + "</div>" +
            "</div>" +
            '<div class="adm-item__ops"></div>';
          var del = el("button", { class: "adm-mini adm-mini--danger", type: "button", text: "删除" });
          del.addEventListener("click", function () {
            if (!confirmDelete("友链「" + r.name + "」")) return;
            window.Store.remove("friends", r.id)
              .then(function () { self.loadList(); })
              .catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
          });
          $(".adm-item__ops", item).appendChild(del);
          host.appendChild(item);
        });
      }).catch(function (err) {
        host.innerHTML = '<p class="adm-hint" style="color:#c2506f">读取失败：' + esc(err.message) + "</p>";
      });
    },
  };

  /* ==========================================================================
   * 10. 面板：网站设置
   *     这里改的东西会存进数据库，前台刷新就变
   * ======================================================================== */
  Panels.settings = {
    cfg: null,

    render: function (panel) {
      var self = this;
      panel.innerHTML = '<div class="adm-card glass"><p class="adm-hint">正在读取设置…</p></div>';

      window.Store.fetchSiteConfig().then(function (cfg) {
        self.cfg = cfg || {};
        self.renderForm(panel);
      }).catch(function (err) {
        panel.innerHTML = '<div class="adm-card glass"><p class="adm-hint" style="color:#c2506f">' +
          esc(err.message) + "</p></div>";
      });
    },

    renderForm: function (panel) {
      var self = this;
      var c = this.cfg || {};
      var hero = c.hero || {};
      var p = c.profile || {};
      var about = c.about || {};
      var footer = c.footer || {};

      panel.innerHTML = "";
      var wrap = el("div", { class: "adm-settings" });

      /* ---------- 10.1 基本信息 ---------- */
      var card1 = el("div", { class: "adm-card glass reveal" });
      card1.innerHTML =
        '<div class="adm-card__head"><h3>① 基本信息</h3></div>' +
        '<p class="adm-hint">这些内容会显示在浏览器标签页、导航栏左上角和分享卡片里。</p>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="sName">网站名字</label>' +
            '<input class="field" id="sName" type="text" value="' + U.escapeAttr(c.name || "") + '" placeholder="我的小窝"></div>' +
          '<div><label class="field-label" for="sSince">建站年份</label>' +
            '<input class="field" id="sSince" type="text" value="' + U.escapeAttr(c.since || "") + '" placeholder="2025"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="sSlogan">一句话标语（显示在页脚）</label>' +
          '<input class="field" id="sSlogan" type="text" value="' + U.escapeAttr(c.slogan || "") + '"></div>' +
        '<div class="adm-field"><label class="field-label" for="sUrl">网站网址（部署后填，例如 https://xxx.github.io）</label>' +
          '<input class="field" id="sUrl" type="text" value="' + U.escapeAttr(c.url || "") + '"></div>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="sIcp">备案号（没有就留空）</label>' +
            '<input class="field" id="sIcp" type="text" value="' + U.escapeAttr(c.icp || "") + '"></div>' +
          '<div><label class="field-label" for="sDesc">网站简介（给搜索引擎看的）</label>' +
            '<input class="field" id="sDesc" type="text" value="' + U.escapeAttr(c.description || "") + '"></div>' +
        "</div>";
      wrap.appendChild(card1);

      /* ---------- 10.2 导航菜单 ---------- */
      var card2 = el("div", { class: "adm-card glass reveal" });
      card2.innerHTML =
        '<div class="adm-card__head"><h3>② 导航菜单</h3></div>' +
        '<p class="adm-hint">就是网页最上面那一排。顺序按这里从上到下排。' +
        '链接填页面文件名（比如 posts.html），图标随便填一个 emoji。</p>';
      var navEditor = listEditor(
        [
          { key: "icon", label: "图标", placeholder: "🏠" },
          { key: "label", label: "名称", placeholder: "主页" },
          { key: "href", label: "链接", placeholder: "index.html" },
        ],
        c.nav || []
      );
      card2.appendChild(navEditor.node);
      wrap.appendChild(card2);

      /* ---------- 10.3 首页首屏 ---------- */
      var card3 = el("div", { class: "adm-card glass reveal" });
      card3.innerHTML =
        '<div class="adm-card__head"><h3>③ 首页首屏（那几个大字）</h3></div>' +
        '<div class="adm-field"><label class="field-label" for="sHeroTitle">大标题</label>' +
          '<input class="field" id="sHeroTitle" type="text" value="' + U.escapeAttr(hero.title || "") + '" placeholder="欢迎来到我的小窝"></div>' +
        '<div class="adm-field"><label class="field-label" for="sHeroSub">副标题</label>' +
          '<textarea class="field" id="sHeroSub" style="min-height:70px">' + esc(hero.subtitle || "") + "</textarea></div>" +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="sHeroBtn1">第一个按钮的文字</label>' +
            '<input class="field" id="sHeroBtn1" type="text" value="' + U.escapeAttr((hero.primaryBtn || {}).label || "") + '"></div>' +
          '<div><label class="field-label" for="sHeroRain">雨量（0.5 小雨 / 1 中雨 / 2 暴雨）</label>' +
            '<input class="field" id="sHeroRain" type="number" step="0.1" min="0" max="3" value="' +
              U.escapeAttr(String((hero.rain || {}).intensity != null ? (hero.rain || {}).intensity : 1)) + '"></div>' +
        "</div>";
      wrap.appendChild(card3);

      /* ---------- 10.4 关于我 / 个人信息 ---------- */
      var card4 = el("div", { class: "adm-card glass reveal" });
      card4.innerHTML =
        '<div class="adm-card__head"><h3>④ 关于我 / 个人信息</h3></div>' +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="sPName">你的名字/昵称</label>' +
            '<input class="field" id="sPName" type="text" value="' + U.escapeAttr(p.name || "") + '"></div>' +
          '<div><label class="field-label" for="sPRole">一句话身份</label>' +
            '<input class="field" id="sPRole" type="text" value="' + U.escapeAttr(p.role || "") + '" placeholder="计算机专业大一学生"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="sPBio">一句话简介（首页那张卡片上）</label>' +
          '<input class="field" id="sPBio" type="text" value="' + U.escapeAttr(p.bio || "") + '"></div>' +
        '<div class="adm-field"><label class="field-label" for="sPIntro">关于页里的自我介绍（可以写长一点）</label>' +
          '<textarea class="field" id="sPIntro" style="min-height:90px">' + esc(p.intro || "") + "</textarea></div>" +
        '<div class="adm-row">' +
          '<div><label class="field-label" for="sPLoc">所在地</label>' +
            '<input class="field" id="sPLoc" type="text" value="' + U.escapeAttr(p.location || "") + '" placeholder="例如：南京"></div>' +
          '<div><label class="field-label" for="sPStatus">当前状态</label>' +
            '<input class="field" id="sPStatus" type="text" value="' +
              U.escapeAttr((p.status || {}).text || "") + '" placeholder="例如：正在学 Python"></div>' +
        "</div>" +
        '<div class="adm-field"><label class="field-label" for="sPWelcome">留言板顶部的站长留言</label>' +
          '<textarea class="field" id="sPWelcome" style="min-height:70px">' + esc(p.welcome || "") + "</textarea></div>" +
        '<div class="adm-field"><label class="field-label" for="sPAvatar">头像图片地址</label>' +
          '<input class="field" id="sPAvatar" type="text" value="' + U.escapeAttr(p.avatar || "") + '" placeholder="assets/img/avatar.svg">' +
          '<div class="adm-upload" style="margin-top:8px"><span>或者上传一张：</span>' +
            '<input type="file" id="sPAvatarFile" accept="image/*"></div></div>' +
        '<p class="adm-hint">联系方式（邮箱、GitHub 等）、技能条、成长时间线：往下拉，在⑤里填</p>';
      wrap.appendChild(card4);

      /* ---------- 10.5 联系方式 / 技能 / 时间线 ---------- */
      var card5 = el("div", { class: "adm-card glass reveal" });
      card5.innerHTML =
        '<div class="adm-card__head"><h3>⑤ 联系方式 · 技能 · 时间线</h3></div>' +
        '<p class="adm-hint"><b>联系方式</b>：一行一个。图标填 emoji，链接可以填网址或 mailto:你的邮箱</p>';
      var socialEditor = listEditor(
        [
          { key: "icon", label: "图标", placeholder: "🐙" },
          { key: "label", label: "名称", placeholder: "GitHub" },
          { key: "href", label: "链接", placeholder: "https://github.com/你的用户名" },
        ],
        p.socials || []
      );
      card5.appendChild(socialEditor.node);

      var skillTitle = el("p", { class: "adm-hint", style: "margin-top:18px" });
      skillTitle.innerHTML = "<b>技能条</b>：名称 + 百分比（0~100），显示在「关于我」页面";
      card5.appendChild(skillTitle);
      var skillEditor = listEditor(
        [
          { key: "name", label: "技能", placeholder: "Python" },
          { key: "level", label: "百分比", placeholder: "40", type: "number" },
        ],
        about.skills || []
      );
      card5.appendChild(skillEditor.node);

      var tlTitle = el("p", { class: "adm-hint", style: "margin-top:18px" });
      tlTitle.innerHTML = "<b>成长时间线</b>：年份 + 发生的事，显示在「关于我」页面";
      card5.appendChild(tlTitle);
      var tlEditor = listEditor(
        [
          { key: "year", label: "年份", placeholder: "2025" },
          { key: "text", label: "发生了什么", placeholder: "进入大学，开始学编程" },
        ],
        about.timeline || []
      );
      card5.appendChild(tlEditor.node);

      var interests = el("div", { class: "adm-field", style: "margin-top:18px" });
      interests.innerHTML = '<label class="field-label" for="sInterests">兴趣爱好（一行文字）</label>' +
        '<input class="field" id="sInterests" type="text" value="' + U.escapeAttr(about.interests || "") + '" placeholder="写代码、看动画、下雨天发呆">';
      card5.appendChild(interests);
      wrap.appendChild(card5);

      /* ---------- 10.6 页脚 ---------- */
      var card6 = el("div", { class: "adm-card glass reveal" });
      card6.innerHTML = '<div class="adm-card__head"><h3>⑥ 页脚</h3></div>' +
        '<p class="adm-hint"><b>页脚链接</b>：显示在网站最下面</p>';
      var footerEditor = listEditor(
        [
          { key: "label", label: "名称", placeholder: "关于我" },
          { key: "href", label: "链接", placeholder: "about.html" },
        ],
        footer.links || []
      );
      card6.appendChild(footerEditor.node);
      var noteField = el("div", { class: "adm-field", style: "margin-top:18px" });
      noteField.innerHTML = '<label class="field-label" for="sFooterNote">页脚那行小字</label>' +
        '<input class="field" id="sFooterNote" type="text" value="' + U.escapeAttr(footer.note || "") + '">';
      card6.appendChild(noteField);
      wrap.appendChild(card6);

      /* ---------- 保存 ---------- */
      var actions = el("div", { class: "adm-card glass reveal" });
      actions.innerHTML =
        '<div class="adm-actions" style="margin:0">' +
          '<button class="btn btn--primary" type="button" id="sSave">💾 保存所有设置</button>' +
          '<span class="spacer"></span>' +
          '<span class="adm-hint" style="margin:0">保存后刷新网站页面即可看到效果</span>' +
        "</div>" +
        '<p class="adm-msg" id="setMsg"></p>';
      wrap.appendChild(actions);

      panel.appendChild(wrap);
      this.msg = $("#setMsg", panel);

      /* 头像上传 */
      $("#sPAvatarFile", panel).addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setMsg(self.msg, "正在上传头像…");
        window.Store.uploadImage(file, "avatar").then(function (url) {
          $("#sPAvatar", panel).value = url;
          setMsg(self.msg, "✅ 头像已上传，记得点下面的「保存所有设置」");
        }).catch(function (err) { setMsg(self.msg, "❌ " + err.message, true); });
      });

      /* 保存按钮 */
      $("#sSave", panel).addEventListener("click", function () {
        var btn = $("#sSave", panel);
        btn.disabled = true;
        btn.textContent = "保存中…";

        var newCfg = {
          name: $("#sName", panel).value.trim() || "我的小窝",
          slogan: $("#sSlogan", panel).value.trim(),
          description: $("#sDesc", panel).value.trim(),
          url: $("#sUrl", panel).value.trim(),
          since: $("#sSince", panel).value.trim(),
          icp: $("#sIcp", panel).value.trim(),
          nav: navEditor.getData(),
          hero: {
            eyebrow: (self.cfg.hero || {}).eyebrow || "Nice to meet you · 欢迎光临",
            title: $("#sHeroTitle", panel).value.trim() || "欢迎来到我的小窝",
            subtitle: $("#sHeroSub", panel).value.trim(),
            primaryBtn: {
              label: $("#sHeroBtn1", panel).value.trim() || "📖 开始阅读",
              href: ((self.cfg.hero || {}).primaryBtn || {}).href || "posts.html",
            },
            secondaryBtn: (self.cfg.hero || {}).secondaryBtn || { label: "🌸 认识一下", href: "about.html" },
            rain: {
              intensity: Number($("#sHeroRain", panel).value) || 1,
              ripple: 1,
              windX: -0.14,
              showMist: true,
            },
          },
          profile: {
            name: $("#sPName", panel).value.trim(),
            avatar: $("#sPAvatar", panel).value.trim() || "assets/img/avatar.svg",
            role: $("#sPRole", panel).value.trim(),
            bio: $("#sPBio", panel).value.trim(),
            intro: $("#sPIntro", panel).value.trim(),
            location: $("#sPLoc", panel).value.trim(),
            status: {
              emoji: (self.cfg.profile && self.cfg.profile.status && self.cfg.profile.status.emoji) || "🌱",
              text: $("#sPStatus", panel).value.trim(),
            },
            socials: socialEditor.getData(),
            welcome: $("#sPWelcome", panel).value.trim(),
          },
          about: {
            skills: skillEditor.getData(),
            timeline: tlEditor.getData(),
            interests: $("#sInterests", panel).value.trim(),
          },
          footer: {
            links: footerEditor.getData(),
            note: $("#sFooterNote", panel).value.trim(),
          },
        };

        window.Store.saveSiteConfig(newCfg).then(function () {
          self.cfg = newCfg;
          btn.disabled = false;
          btn.textContent = "💾 保存所有设置";
          setMsg(self.msg, "✅ 保存成功！刷新网站页面就能看到新设置");
        }).catch(function (err) {
          btn.disabled = false;
          btn.textContent = "💾 保存所有设置";
          setMsg(self.msg, "❌ " + err.message, true);
        });
      });
    },
  };

  /* 面板注册表（键名要和 TABS 里的 key 一致） */
  var PANELS = {
    posts: Panels.posts,
    notes: Panels.notes,
    gallery: Panels.gallery,
    logs: Panels.logs,
    comments: Panels.comments,
    friends: Panels.friends,
    settings: Panels.settings,
  };

  /* ==========================================================================
   * 11. 启动
   * ======================================================================== */
  function boot() {
    var host = document.getElementById("adminApp");
    if (!host) return;

    /* 等数据库连接和内容数据都准备好，再决定显示登录还是后台 */
    var wait = [];
    if (window.CONTENT && window.CONTENT.ready) wait.push(window.CONTENT.ready);
    if (window.Store) wait.push(window.Store.connect());

    Promise.all(wait).then(function () {
      var st = (window.CONTENT && window.CONTENT.state) || {};

      /* 数据库都没连上，直接提示怎么连 */
      if (!st.ok) {
        host.innerHTML =
          '<div class="adm-login glass">' +
            '<div class="adm-login__logo">🔌</div>' +
            '<h1 class="adm-login__title">还不能使用后台</h1>' +
            '<p class="adm-login__desc">' + esc(st.message || "数据库还没连接。") + "</p>" +
            '<div class="adm-login__help">' +
              "<b>怎么连上数据库？</b><br>" +
              "① 打开 content/config.js<br>" +
              "② 把 Supabase 的 Project URL 和 anon key 填进去<br>" +
              "③ 保存并刷新这个页面<br>" +
              "（详细步骤看《新手操作手册.md》）" +
            "</div>" +
            '<p style="margin-top:16px"><a class="btn" href="index.html">← 先回网站看看</a></p>' +
          "</div>";
        return;
      }

      /* 已经登录过就直接进后台，否则显示登录框 */
      window.Store.currentUser().then(function (user) {
        if (user) Dashboard.start(user);
        else Login.render(host);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
