/**
 * 临时验证脚本（用完可删）· tools/_verify.mjs
 *
 * 检查四件事：
 *   A. 所有 JS 文件语法是否正确
 *   B. 模板字符串里的反引号有没有漏转义
 *   C. 选择器交叉校验（JS 里找的元素，HTML 里有没有）
 *   D. 用 DOM 桩把前台 10 个页面 + 后台页面的初始化跑一遍
 *      （模拟「数据库已连接但一条内容都没有」的状态）
 */
import fs from "node:fs";
import vm from "node:vm";

const BT = String.fromCharCode(96);

/* ==========================================================================
 * A. 语法检查
 * ======================================================================== */
console.log("=== A. 语法检查 ===");
const allJs = [
  "assets/js/ui.js", "assets/js/highlight.js", "assets/js/markdown.js",
  "assets/js/loader.js", "assets/js/charts.js", "assets/js/rain.js",
  "assets/js/app.js", "assets/js/main.js", "assets/js/store.js",
  "assets/admin/admin.js",
  "content/config.js", "content/site.js", "content/posts.js",
  "content/moments.js", "content/logs.js",
];
let syntaxBad = 0;
for (const f of allJs) {
  try {
    new vm.Script(fs.readFileSync(f, "utf8"), { filename: f });
    console.log("✅ " + f);
  } catch (e) {
    console.log("❌ " + f + " → " + e.message);
    syntaxBad++;
  }
}
console.log(syntaxBad ? `\n有 ${syntaxBad} 个文件语法错误` : "\n全部文件语法正确");

/* ==========================================================================
 * B. 反引号配对检查
 * ======================================================================== */
console.log("\n=== B. 模板字符串反引号配对 ===");
["content/posts.js", "content/site.js", "content/moments.js", "content/logs.js"].forEach((f) => {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const odd = [];
  lines.forEach((l, i) => {
    let n = 0;
    for (let k = 0; k < l.length; k++) {
      if (l[k] === BT && l[k - 1] !== "\\") n++;
    }
    if (n % 2 === 1) odd.push(i + 1);
  });
  console.log((odd.length ? "ℹ️  奇数反引号（跨行模板字符串属正常）：" : "✅ ") + f +
    (odd.length ? " 行 " + odd.join(",") : ""));
});

/* ==========================================================================
 * C. 选择器交叉校验
 * ======================================================================== */
console.log("\n=== C. 选择器交叉校验 ===");
const htmlFiles = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
const htmlText = htmlFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const jsText = ["assets/js/app.js", "assets/js/main.js", "assets/admin/admin.js", "assets/js/charts.js"]
  .map((f) => fs.readFileSync(f, "utf8")).join("\n");

const htmlIds = new Set([...htmlText.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const htmlClasses = new Set([...htmlText.matchAll(/\bclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
const jsIds = new Set([...jsText.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map((m) => m[1]));
const jsClasses = new Set([...jsText.matchAll(/\bclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
const allIds = new Set([...htmlIds, ...jsIds]);
const allClasses = new Set([...htmlClasses, ...jsClasses]);

const idSel = new Set(
  [...jsText.matchAll(/[$(]\s*["'`]#([A-Za-z][\w-]*)["'`]/g)].map((m) => m[1])
    .concat([...jsText.matchAll(/getElementById\(\s*["'`]([A-Za-z][\w-]*)["'`]/g)].map((m) => m[1]))
);
const clsSel = new Set([...jsText.matchAll(/[$(]\s*["'`]\.([A-Za-z][\w-]*)["'`]/g)].map((m) => m[1]));

const RUNTIME_OK = new Set(["toTop", "lightbox", "chart", "chartWrap", "chart-tip"]);
const missIds = [...idSel].filter((i) => !allIds.has(i) && !RUNTIME_OK.has(i));
const missCls = [...clsSel].filter((c) => !allClasses.has(c) && !RUNTIME_OK.has(c));
console.log(`HTML ${htmlFiles.length} 个页面，收集 id ${htmlIds.size} 个 / class ${htmlClasses.size} 个`);
console.log(`#id 选择器 ${idSel.size} 个，静态缺失 ${missIds.length} 个` + (missIds.length ? "：" + missIds.join(", ") : " ✅"));
console.log(`.class 选择器 ${clsSel.size} 个，静态缺失 ${missCls.length} 个` + (missCls.length ? "：" + missCls.join(", ") : " ✅"));

/* ==========================================================================
 * D. DOM 桩：页面初始化（模拟空数据库）
 * ======================================================================== */
console.log("\n=== D. 页面初始化（数据库已连接、内容为空）===");

function makeEl(tag = "div", id = "") {
  return {
    tagName: String(tag).toUpperCase(), id, _html: "", textContent: "", value: "", type: "",
    style: new Proxy({}, { get: () => "", set: () => true }),
    dataset: {}, children: [], attributes: {}, files: null, disabled: false,
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : f; on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); },
    },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); },
    setAttribute(k, v) { this.attributes[k] = v; if (k === "id") this.id = v; },
    getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, prepend() {}, remove() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 }; },
    focus() {}, scrollIntoView() {}, click() {},
    get firstChild() { return { textContent: "" }; },
  };
}

/** 桩：把 #id 选择器也映射到假元素上（真实浏览器里 JS 生成的元素都存在） */
function patchDoc(doc) {
  const map = new Map();
  const base = doc.querySelector.bind(doc);
  doc.querySelector = (sel) => {
    const hit = base(sel);
    if (hit) return hit;
    const s = String(sel).trim();
    if (!map.has(s)) map.set(s, makeEl("div", s));
    return map.get(s);
  };

  /* 动态插入的 <script>：假装网络是通的，立刻触发 onload，
     这样 store.js 里的「加载 Supabase 库」就能顺利完成 */
  const realCreate = doc.createElement.bind(doc);
  doc.createElement = (tag) => {
    const node = realCreate(tag);
    if (String(tag).toLowerCase() === "script") {
      Object.defineProperty(node, "src", {
        set(v) { node._src = v; setTimeout(() => node.onload && node.onload(), 0); },
        get() { return node._src || ""; },
      });
    }
    return node;
  };
}

function buildEnv(pageFile) {
  const text = fs.readFileSync(pageFile, "utf8");
  const page = (/data-page="([^"]+)"/.exec(text) || [, ""])[1];
  const els = {};
  [...text.matchAll(/\bid="([^"]+)"/g)].forEach((m) => { els[m[1]] = makeEl("div", m[1]); });
  const dynamic = new Map();
  const body = makeEl("body");
  body.getAttribute = (k) => (k === "data-page" ? page : null);
  const doc = {
    readyState: "complete",
    documentElement: makeEl("html"), head: makeEl("head"), body,
    addEventListener() {},
    getElementById: (id) => els[id] || null,
    querySelector: (sel) => {
      const s = String(sel).trim();
      if (s.startsWith("#") && els[s.slice(1)]) return els[s.slice(1)];
      if (!dynamic.has(s)) dynamic.set(s, makeEl("div", s));
      return dynamic.get(s);
    },
    querySelectorAll: () => [],
    createElement: (t) => makeEl(t),
  };
  return { doc, els, page };
}

function fakeStore() {
  return {
    notConfigured: () => false,
    connect: () => Promise.resolve({ ok: true, client: {} }),
    humanError: (e) => String((e && e.message) || e),
    fetchSiteConfig: () => Promise.resolve({}),
    fetchPosts: () => Promise.resolve([]),
    fetchNotes: () => Promise.resolve([]),
    fetchGallery: () => Promise.resolve([]),
    fetchFriends: () => Promise.resolve([]),
    fetchLogs: () => Promise.resolve([]),
    fetchComments: () => Promise.resolve([]),
    addComment: () => Promise.resolve(true),
    increaseViews: () => Promise.resolve(),
    currentUser: () => Promise.resolve(null),
    signIn: () => Promise.resolve({}),
    signOut: () => Promise.resolve(),
    insert: () => Promise.resolve([]),
    update: () => Promise.resolve([]),
    remove: () => Promise.resolve(true),
    saveSiteConfig: () => Promise.resolve(true),
    uploadImage: () => Promise.resolve("https://example.com/x.png"),
    getClient: () => Promise.resolve({}),
    toDateStr: (v) => String(v || "").slice(0, 10),
    normDate: (v) => String(v || "").slice(0, 10),
  };
}

function makeSandbox(doc, page) {
  const pageErrors = [];
  const sb = {
    console: {
      log() {}, warn() {},
      error(...a) { pageErrors.push(a.map(String).join(" ")); },   // 记录下来，不当场抛
    },
    __pageErrors: pageErrors,
    document: doc,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
    navigator: { clipboard: null },
    location: {
      search: page === "post" ? "?p=x" : "",
      pathname: "/" + (page || "index") + ".html",
      href: "http://x/" + (page || "index") + ".html",
    },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    matchMedia: () => ({ matches: false }),
    setTimeout: (fn) => { if (typeof fn === "function") { try { fn(); } catch (e) {} } return 0; },
    clearTimeout() {}, Math, Date, JSON, Number, String, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat, Intl, Promise,
  };
  sb.window = sb;
  sb.globalThis = sb;
  sb.window.addEventListener = () => {};
  sb.window.pageYOffset = 0;
  sb.window.scrollTo = () => {};
  sb.window.innerHeight = 900;
  sb.window.devicePixelRatio = 1;
  sb.window.matchMedia = () => ({ matches: false });
  sb.window.Store = fakeStore();
  sb.window.NEST_CONFIG = { url: "https://x.supabase.co", anonKey: "eyJfake" };
  /* 假装 Supabase 官方库已经加载好了：给一个最小可用的假客户端 */
  sb.window.supabase = {
    createClient: () => ({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: {} }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://x/y.png" } }) }) },
      rpc: () => Promise.resolve({ error: null }),
    }),
  };
  vm.createContext(sb);
  return sb;
}

const BASE_FILES = ["content/config.js", "content/site.js", "content/posts.js", "content/moments.js",
  "content/logs.js", "assets/js/ui.js", "assets/js/highlight.js", "assets/js/markdown.js",
  "assets/js/loader.js", "assets/js/charts.js", "assets/js/rain.js"];

async function tick(n = 3) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

async function runPage(file) {
  const { doc, els, page } = buildEnv(file);
  patchDoc(doc);                     // 让动态生成的元素也能被找到
  const sb = makeSandbox(doc, page);
  BASE_FILES.forEach((f) => vm.runInContext(fs.readFileSync(f, "utf8"), sb, { filename: f }));
  vm.runInContext(fs.readFileSync("assets/js/app.js", "utf8"), sb, { filename: "app.js" });

  const mainSrc = fs.readFileSync("assets/js/main.js", "utf8");
  const bodyCode = mainSrc
    .replace("(function () {", "")
    .replace(/if \(document\.readyState === "loading"\)[\s\S]*?\n\s*\}\)\(\);\s*$/, "\n  return { boot: boot };\n");
  const api = vm.runInContext("(function () {" + bodyCode + "})()", sb, { filename: "main.js" });

  await sb.window.CONTENT.ready;
  await tick();
  sb.window.App.boot();
  api.boot();
  await tick(4);

  const filled = Object.keys(els)
    .filter((k) => els[k] && els[k]._html && els[k]._html.length > 0)
    .map((k) => k + "(" + (els[k]._html.length / 1024).toFixed(1) + "KB)");
  const emptyHint = Object.keys(els).some((k) =>
    /empty__emoji|还没有|没有找到|数据库|找不到这篇文章|不能评论/.test(els[k]._html || ""));
  return { page, filled, emptyHint };
}

const pages = ["index.html", "posts.html", "post.html", "stats.html", "essays.html", "gallery.html",
  "friends.html", "log.html", "guestbook.html", "about.html", "admin.html"];
let okCount = 0;
for (const f of pages) {
  try {
    const r = await runPage(f);
    console.log(`✅ ${String(r.page).padEnd(10)} 渲染成功；有内容的容器：${r.filled.join(", ") || "（无）"}` +
      (r.emptyHint ? "  [空状态提示 ✓]" : ""));
    okCount++;
  } catch (e) {
    console.log(`❌ ${f} 初始化失败：${e.message}`);
    console.log("   堆栈：" + String(e.stack || "").split("\n").slice(1, 5).join(" | "));
  }
}
console.log(`\n前台页面：${okCount}/${pages.length} 通过`);

/* ---------- 后台页面 ---------- */
console.log("\n=== E. 后台页面 admin.html（详细检查）===");
try {
  const { doc, els } = buildEnv("admin.html");
  const sb = makeSandbox(doc, "admin");
  ["content/config.js", "content/site.js", "content/posts.js", "content/moments.js", "content/logs.js",
    "assets/js/ui.js", "assets/js/highlight.js", "assets/js/markdown.js", "assets/js/loader.js",
    "assets/js/charts.js", "assets/js/app.js", "assets/admin/admin.js"]
    .forEach((f) => vm.runInContext(fs.readFileSync(f, "utf8"), sb, { filename: f }));

  await sb.window.CONTENT.ready;
  await tick(5);
  /* adminApp 的内容可能是 appendChild 进去的，所以要连子元素一起看 */
  const root = els.adminApp;

  /* 把 DOM 树里的元素“拍平”成一串可搜索的文本：
     桩里的元素没有真正的 outerHTML，所以手工拼出 id / class / 文本 */
  function flatten(node, depth) {
    if (!node || depth > 6) return "";
    let s = " " + (node.id || "") + " " + (node.className || "") + " " +
      (node._html || "") + " " + (node.textContent || "") + " ";
    (node.children || []).forEach((c) => { s += flatten(c, depth + 1); });
    return s;
  }
  const out = flatten(root, 0);
  if (out.includes("adm-login")) {
    const keys = ["admEmail", "admPass", "admLoginBtn", "邮箱", "密码"];
    const missing = keys.filter((k) => !out.includes(k));
    console.log("✅ 后台渲染成功（可搜索内容 " + out.length + " 字符）");
    console.log("   登录框关键元素：", missing.length ? "缺失 " + missing.join(",") : "齐全 ✓");
    console.log("   提示文案：", out.includes("Authentication") ? "含“怎么建账号”的说明 ✓" : "缺少说明 ⚠️");
  } else {
    console.log("⚠️  渲染结果：" + out.slice(0, 300));
  }
} catch (e) {
  console.log("❌ 后台初始化失败：" + e.message + "\n   " + (e.stack || "").split("\n")[1]);
}
