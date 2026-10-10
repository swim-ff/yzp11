/**
 * ============================================================================
 *  数据库连接层 · assets/js/store.js
 * ----------------------------------------------------------------------------
 *  这个文件是「网站」和「Supabase 数据库」之间的中间人。它负责：
 *
 *    1. 加载 Supabase 官方库（优先用你放到 assets/lib/ 里的本地文件，
 *       本地没有就自动从网上加载，两个都不行就给出人话提示）
 *    2. 读数据：文章、随笔、相册、友链、日志、留言、网站设置
 *    3. 写数据：新增 / 修改 / 删除（只有登录后才有权限，权限由数据库把关）
 *    4. 登录 / 退出登录
 *    5. 上传图片到 Supabase 的图片仓库
 *
 *  给以后想改代码的你：
 *    这个文件把数据库的「下划线命名」（cover_art）翻译成网页用的「驼峰命名」
 *    （coverArt），外面的人不用关心数据库长什么样。想加新表，照着下面
 *    加一个 mapRow 函数和一组读写方法就行。
 * ============================================================================
 */
window.Store = (function () {
  "use strict";

  var CFG = window.NEST_CONFIG || {};
  var client = null;          // Supabase 客户端实例
  var readyPromise = null;    // 加载库 + 建立连接的 Promise

  /* ==========================================================================
   * 一、加载 Supabase 库
   * ======================================================================== */

  /* 本地文件路径（想彻底离线用，就把库下载到这个位置，见《新手操作手册》） */
  var LOCAL_LIB = "assets/lib/supabase.js";
  /* 网上备用地址：@2 表示用 supabase-js 的第 2 代最新版（API 保持兼容） */
  var CDN_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  /** 动态插入一个 <script>，成功/失败都会回调 */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      /* 加固：万一网络卡住，onerror/onload 都不触发，也要在 15 秒后放弃，
         否则页面会一直停在“加载中”，小白用户完全不知道发生了什么 */
      var timer = setTimeout(function () {
        reject(new Error("加载超时（网络太慢或连不上）：" + src));
      }, 15000);

      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { clearTimeout(timer); resolve(src); };
      s.onerror = function () { clearTimeout(timer); reject(new Error("加载不了：" + src)); };
      document.head.appendChild(s);
    });
  }

  /** 依次尝试本地、CDN，直到拿到 supabase.createClient */
  function ensureLibrary() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      return Promise.resolve();
    }
    return loadScript(LOCAL_LIB)
      .then(function () {
        if (window.supabase && window.supabase.createClient) return;
        throw new Error("本地文件里没有 createClient");
      })
      .catch(function () {
        /* 本地没有就用网上的 */
        return loadScript(CDN_LIB).then(function () {
          if (!window.supabase || !window.supabase.createClient) {
            throw new Error("Supabase 库加载失败");
          }
        });
      });
  }

  /* ==========================================================================
   * 二、连接
   * ======================================================================== */

  /** 检查 content/config.js 里的两个值填了没 */
  function notConfigured() {
    return !CFG.url || !CFG.anonKey || /^\s*$/.test(String(CFG.url));
  }

  /**
   * 建立连接（只会执行一次，之后复用）
   * 返回值：Promise<{ ok: true, client } | { ok: false, reason, message }>
   */
  function connect() {
    if (readyPromise) return readyPromise;

    if (notConfigured()) {
      readyPromise = Promise.resolve({
        ok: false,
        reason: "not-configured",
        message: "还没有连接数据库：请打开 content/config.js，把 Supabase 的网址和密钥填进去。",
      });
      return readyPromise;
    }

    readyPromise = ensureLibrary()
      .then(function () {
        client = window.supabase.createClient(CFG.url, CFG.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
        return { ok: true, client: client };
      })
      .catch(function (err) {
        return {
          ok: false,
          reason: "lib-failed",
          message:
            "Supabase 库加载失败（" + (err && err.message ? err.message : "未知原因") + "）。" +
            "可能是网络连不上 jsdelivr。解决办法：按《新手操作手册》里的「离线用法」，" +
            "把库文件下载到 assets/lib/supabase.js，本地有文件就不再需要联网了。",
        };
      });

    return readyPromise;
  }

  /** 等连接好，拿到客户端（没配好就抛错，方便调用方 catch） */
  function getClient() {
    return connect().then(function (res) {
      if (!res.ok) throw new Error(res.message);
      return res.client;
    });
  }

  /* ==========================================================================
   * 三、小工具
   * ======================================================================== */

  /** 把数据库返回的 date 类型切成 "2025-07-10" 这种干净格式 */
  function toDateStr(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  /** 把 "2025-07-10" 或者空值统一处理 */
  function normDate(value) {
    if (!value) return new Date().toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  /** 数组字段兜底（NULL → []） */
  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  /**
   * 统一处理错误：把 Supabase 的英文报错翻成人话
   * 这样你在后台看到的都是中文提示，不用去猜
   */
  function humanError(err) {
    var msg = (err && err.message) || "未知错误";
    if (/Invalid login credentials/i.test(msg)) return "邮箱或密码不对，请再试一次。";
    if (/Email not confirmed/i.test(msg)) return "这个账号还没确认。请到 Supabase 的 Authentication → Users 里，把用户的 Auto Confirm 打开（或重新建一个勾选 Auto Confirm 的用户）。";
    if (/row-level security|permission denied/i.test(msg)) return "数据库拒绝了这次操作（权限不够）。请确认你已经登录，并且数据库里执行过 supabase/schema.sql。";
    if (/relation .* does not exist|Could not find the table/i.test(msg)) return "找不到数据表。请确认已经在 Supabase 的 SQL Editor 里执行过 supabase/schema.sql 这份脚本。";
    if (/JWT|token/i.test(msg)) return "登录状态过期了，请重新登录一次。";
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return "网络连不上 Supabase。请检查网线/WiFi，或确认 content/config.js 里的网址填对了。";
    if (/duplicate key/i.test(msg)) return "有重复的数据（比如两篇文章用了同一个链接标识 slug），换一个再试。";
    if (/Bucket not found/i.test(msg)) return "找不到图片仓库。请确认 schema.sql 执行完整（它会自动创建 post-images 这个仓库）。";
    return msg;
  }

  /* ==========================================================================
   * 四、读数据（网站前台用）
   * ======================================================================== */

  /**
   * 读取网站设置（站名、导航、首页文案、个人信息……）
   * 如果数据库里还没写，返回 null，前台会退回用 content/site.js 里的默认值
   */
  function fetchSiteConfig() {
    return getClient()
      .then(function (sb) {
        return sb.from("site_config").select("data").eq("id", 1).maybeSingle();
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data && res.data.data) || null;
      })
      .catch(function (err) {
        if (window.console) console.warn("[小窝] 读取网站设置失败：", err.message);
        return null;
      });
  }

  /**
   * 读取所有已发布的文章
   * @returns {Promise<Array>} 已经整理成网页需要的字段结构
   */
  function fetchPosts() {
    return getClient()
      .then(function (sb) {
        return sb
          .from("posts")
          .select("slug,title,date,category,tags,excerpt,cover_art,cover_src,content,views")
          .eq("published", true)
          .order("date", { ascending: false });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data || []).map(function (r) {
          return {
            slug: r.slug,
            title: r.title,
            date: toDateStr(r.date),
            category: r.category || "未分类",
            tags: toArray(r.tags),
            excerpt: r.excerpt || "",
            cover: r.cover_src ? { src: r.cover_src } : { art: r.cover_art || "grass" },
            content: r.content || "",
            views: r.views || 0,
          };
        });
      });
  }

  /** 读取随笔 */
  function fetchNotes() {
    return getClient()
      .then(function (sb) {
        return sb.from("notes").select("id,date,mood,text,images,likes").order("date", { ascending: false });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data || []).map(function (r) {
          return {
            id: r.id,
            date: toDateStr(r.date),
            mood: r.mood || "",
            text: r.text || "",
            images: Array.isArray(r.images) ? r.images : [],
            likes: r.likes || 0,
          };
        });
      });
  }

  /** 读取相册 */
  function fetchGallery() {
    return getClient()
      .then(function (sb) {
        return sb.from("gallery").select("id,title,date,src,art,description,sort_order")
          .order("sort_order", { ascending: true })
          .order("date", { ascending: false });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data || []).map(function (r) {
          return {
            id: r.id,
            title: r.title || "未命名",
            date: toDateStr(r.date),
            src: r.src || "",
            art: r.art || "bokeh",
            desc: r.description || "",
          };
        });
      });
  }

  /** 读取友链 */
  function fetchFriends() {
    return getClient()
      .then(function (sb) {
        return sb.from("friends").select("id,name,url,description,avatar,color,sort_order")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data || []).map(function (r) {
          return {
            id: r.id,
            name: r.name,
            url: r.url,
            desc: r.description || "",
            avatar: r.avatar || "",
            color: r.color || "sakura",
          };
        });
      });
  }

  /** 读取更新日志 */
  function fetchLogs() {
    return getClient()
      .then(function (sb) {
        return sb.from("logs").select("id,version,date,title,tags,items").order("date", { ascending: false });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return (res.data || []).map(function (r) {
          return {
            id: r.id,
            version: r.version,
            date: toDateStr(r.date),
            title: r.title || "",
            tags: toArray(r.tags),
            items: Array.isArray(r.items) ? r.items : [],
          };
        });
      });
  }

  /** 读取某篇文章的留言（只拿已通过的） */
  function fetchComments(postSlug) {
    return getClient()
      .then(function (sb) {
        return sb.from("comments").select("id,name,text,created_at")
          .eq("post_slug", postSlug)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(200);
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return res.data || [];
      });
  }

  /** 提交一条留言（谁都能用，不需要登录） */
  function addComment(postSlug, name, text) {
    return getClient()
      .then(function (sb) {
        return sb.from("comments").insert({
          post_slug: postSlug,
          name: String(name).trim().slice(0, 24),
          text: String(text).trim().slice(0, 500),
        });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return true;
      });
  }

  /** 浏览量 +1（失败也不影响阅读，所以静默处理） */
  function increaseViews(slug) {
    return getClient()
      .then(function (sb) { return sb.rpc("increment_views", { p_slug: slug }); })
      .catch(function () { /* 忽略 */ });
  }

  /* ==========================================================================
   * 五、登录 / 退出（后台用）
   * ======================================================================== */

  function signIn(email, password) {
    return getClient()
      .then(function (sb) { return sb.auth.signInWithPassword({ email: email, password: password }); })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return res.data.user;
      });
  }

  function signOut() {
    return getClient().then(function (sb) { return sb.auth.signOut(); });
  }

  /** 拿当前登录的人（没登录返回 null） */
  function currentUser() {
    return getClient()
      .then(function (sb) { return sb.auth.getUser(); })
      .then(function (res) { return (res.data && res.data.user) || null; })
      .catch(function () { return null; });
  }

  /* ==========================================================================
   * 六、写数据（后台用；数据库会检查你登录了没）
   * ======================================================================== */

  /** 新增一行 */
  function insert(table, row) {
    return getClient()
      .then(function (sb) { return sb.from(table).insert(row).select(); })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return res.data;
      });
  }

  /** 按 id 修改一行 */
  function update(table, id, patch) {
    return getClient()
      .then(function (sb) { return sb.from(table).update(patch).eq("id", id).select(); })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return res.data;
      });
  }

  /** 按 id 删除一行 */
  function remove(table, id) {
    return getClient()
      .then(function (sb) { return sb.from(table).delete().eq("id", id); })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return true;
      });
  }

  /** 保存网站设置（整个 JSON 覆盖写入） */
  function saveSiteConfig(data) {
    return getClient()
      .then(function (sb) {
        return sb.from("site_config").upsert({ id: 1, data: data, updated_at: new Date().toISOString() });
      })
      .then(function (res) {
        if (res.error) throw new Error(humanError(res.error));
        return true;
      });
  }

  /* ==========================================================================
   * 七、上传图片
   * ======================================================================== */

  /**
   * 上传一张图片到图片仓库，返回它的公开网址
   * @param {File} file 用户在后台选择的图片
   * @param {string} folder 放在哪个子文件夹（比如 "covers" / "notes" / "gallery"）
   * @returns {Promise<string>} 图片网址
   */
  function uploadImage(file, folder) {
    if (!file) return Promise.reject(new Error("没有选择图片"));
    if (file.size > 5 * 1024 * 1024) {
      return Promise.reject(new Error("这张图片超过 5MB 了，请先压缩一下（或者换一张小一点的）。"));
    }

    return getClient().then(function (sb) {
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      var stamp = new Date().toISOString().slice(0, 10);
      var rand = Math.random().toString(36).slice(2, 8);
      var path = (folder || "misc") + "/" + stamp + "-" + rand + "." + ext;

      return sb.storage
        .from(CFG.bucket || "post-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false })
        .then(function (res) {
          if (res.error) throw new Error(humanError(res.error));
          var pub = sb.storage.from(CFG.bucket || "post-images").getPublicUrl(path);
          return pub.data.publicUrl;
        });
    });
  }

  /* ==========================================================================
   * 八、对外暴露的方法
   * ======================================================================== */
  return {
    /* 连接状态 */
    connect: connect,
    notConfigured: notConfigured,
    humanError: humanError,

    /* 读 */
    fetchSiteConfig: fetchSiteConfig,
    fetchPosts: fetchPosts,
    fetchNotes: fetchNotes,
    fetchGallery: fetchGallery,
    fetchFriends: fetchFriends,
    fetchLogs: fetchLogs,
    fetchComments: fetchComments,
    increaseViews: increaseViews,

    /* 留言 */
    addComment: addComment,

    /* 登录 */
    signIn: signIn,
    signOut: signOut,
    currentUser: currentUser,

    /* 写 */
    insert: insert,
    update: update,
    remove: remove,
    saveSiteConfig: saveSiteConfig,
    uploadImage: uploadImage,

    /* 工具 */
    toDateStr: toDateStr,
    normDate: normDate,
  };
})();
