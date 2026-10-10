/**
 * ============================================================================
 *  内容加工与统计 · assets/js/loader.js
 * ----------------------------------------------------------------------------
 *  这个文件负责把「数据库里的一堆行」加工成「网页好用的样子」：
 *
 *    · 从数据库拉取文章 / 随笔 / 相册 / 友链 / 日志 / 网站设置
 *    · 按日期倒序排好
 *    · 自动算字数和预计阅读时间（你在后台不用填这些，它自己算）
 *    · 统计标签、分类、每个月的发文数量（统计页的图表要用）
 *    · 提供搜索、筛选、相关文章推荐
 *
 *  【重要】数据是异步从网上取的，所以每个页面在渲染前都会先等一下
 *          window.CONTENT.ready 这个承诺（Promise）。
 *          如果数据库还没配置好，ready 也会正常结束，
 *          只是里面是空数据 + 一条给人看的提示，页面会显示「还没有内容」。
 *
 *  所有数据都缓存在内存里的 allPosts / allNotes 等变量中，
 *  页面切换、搜索筛选都是同步读取，速度很快。
 * ============================================================================
 */
window.CONTENT = (function () {
  "use strict";

  /* ==========================================================================
   * 一、内存里的数据（由下面的 load() 从数据库填进来）
   * ======================================================================== */
  var allPosts = [];
  var allNotes = [];
  var allGallery = [];
  var allFriends = [];
  var allLogs = [];

  /** 数据库连接状态，页面用它来决定显示什么提示 */
  var state = {
    loading: true,
    ok: false,             // 数据库读成功了吗
    configured: false,     // content/config.js 填了吗
    message: "",           // 出错时的人话提示
  };

  /* ==========================================================================
   * 二、工具
   * ======================================================================== */

  function toDate(str) {
    var d = new Date(String(str || "").replace(/-/g, "/"));
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  /**
   * 把一篇文章整理成网页需要的完整结构
   * （自动算字数、阅读时间、搜索用文本；日期拆成年月方便做图表）
   */
  function normalizePost(raw) {
    var content = raw.content || "";
    var words = window.UI ? UI.countWords(content) : content.length;
    var dateStr = String(raw.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10);

    return {
      slug: raw.slug,
      title: raw.title || "未命名文章",
      date: dateStr,
      dateObj: toDate(dateStr),
      year: toDate(dateStr).getFullYear(),
      month: toDate(dateStr).getMonth() + 1,
      category: raw.category || "未分类",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      /* 简介：后台没填就自动从正文开头截一段 */
      excerpt: raw.excerpt || (window.MD ? MD.excerpt(content, 110) : ""),
      cover: raw.cover || { art: "grass" },
      readTime: window.UI ? UI.readTime(content) : 1,
      words: words,
      views: raw.views || 0,
      content: content,
      searchText: (
        raw.title + " " + (raw.tags || []).join(" ") + " " + (raw.category || "") + " " +
        (window.MD ? MD.toPlainText(content) : content)
      ).toLowerCase(),
    };
  }

  /* ==========================================================================
   * 三、从数据库加载（每个页面打开时执行一次）
   * ======================================================================== */
  function load() {
    /* 数据库配置还没填：直接给出一条提示，页面照常显示空状态 */
    if (!window.Store || Store.notConfigured()) {
      state.loading = false;
      state.ok = false;
      state.configured = false;
      state.message = "还没有连接数据库。请打开 content/config.js，按里面的说明填上 Supabase 的网址和密钥。";
      return Promise.resolve(state);
    }

    state.configured = true;

    /* 一次把 5 种内容全部取回来（同时发出，速度更快） */
    return Promise.all([
      Store.fetchPosts().catch(function (e) { return { __error: e.message }; }),
      Store.fetchNotes().catch(function (e) { return { __error: e.message }; }),
      Store.fetchGallery().catch(function (e) { return { __error: e.message }; }),
      Store.fetchFriends().catch(function (e) { return { __error: e.message }; }),
      Store.fetchLogs().catch(function (e) { return { __error: e.message }; }),
    ]).then(function (res) {
      var posts = res[0], notes = res[1], gallery = res[2], friends = res[3], logs = res[4];

      /* 任何一个请求出错，都记下来给用户看 */
      var firstError = [posts, notes, gallery, friends, logs].filter(function (x) {
        return x && x.__error;
      })[0];

      if (firstError) {
        state.ok = false;
        state.message = firstError.__error;
      } else {
        state.ok = true;
        allPosts = posts.map(normalizePost).sort(function (a, b) { return b.dateObj - a.dateObj; });
        allNotes = notes.slice().sort(function (a, b) { return toDate(b.date) - toDate(a.date); });
        allGallery = gallery.slice();
        allFriends = friends.slice();
        allLogs = logs.slice().sort(function (a, b) { return toDate(b.date) - toDate(a.date); });
      }

      state.loading = false;
      return state;
    });
  }

  /* ==========================================================================
   * 四、查询接口（页面用，全部是同步的，读的是内存里的数据）
   * ======================================================================== */

  function getAll() { return allPosts.slice(); }
  function getLatest(n) { return allPosts.slice(0, n || 6); }
  function getBySlug(slug) {
    for (var i = 0; i < allPosts.length; i++) {
      if (allPosts[i].slug === slug) return allPosts[i];
    }
    return null;
  }
  function getByTag(tag) {
    return allPosts.filter(function (p) { return p.tags.indexOf(tag) !== -1; });
  }
  function getByCategory(cat) {
    return allPosts.filter(function (p) { return p.category === cat; });
  }

  /** 搜索 + 分类 + 标签 + 排序 一起筛 */
  function query(opt) {
    opt = opt || {};
    var list = allPosts.slice();

    if (opt.category && opt.category !== "全部") {
      list = list.filter(function (p) { return p.category === opt.category; });
    }
    if (opt.tag) {
      list = list.filter(function (p) { return p.tags.indexOf(opt.tag) !== -1; });
    }
    if (opt.q) {
      var q = String(opt.q).toLowerCase().trim();
      list = list.filter(function (p) { return p.searchText.indexOf(q) !== -1; });
    }
    if (opt.sort === "old") {
      list.sort(function (a, b) { return a.dateObj - b.dateObj; });
    } else if (opt.sort === "words") {
      list.sort(function (a, b) { return b.words - a.words; });
    }
    return list;
  }

  /** 相关文章：同分类 + 标签重合度 */
  function getRelated(slug, n) {
    var target = getBySlug(slug);
    if (!target) return [];
    return allPosts
      .filter(function (p) { return p.slug !== slug; })
      .map(function (p) {
        var score = 0;
        if (p.category === target.category) score += 3;
        target.tags.forEach(function (t) {
          if (p.tags.indexOf(t) !== -1) score += 2;
        });
        return { post: p, score: score };
      })
      .sort(function (a, b) { return b.score - a.score || b.post.dateObj - a.post.dateObj; })
      .slice(0, n || 3)
      .map(function (x) { return x.post; });
  }

  /** 上一篇（更早）/ 下一篇（更新） */
  function getNeighbors(slug) {
    var idx = -1;
    for (var i = 0; i < allPosts.length; i++) {
      if (allPosts[i].slug === slug) { idx = i; break; }
    }
    if (idx === -1) return { prev: null, next: null };
    return { prev: allPosts[idx + 1] || null, next: allPosts[idx - 1] || null };
  }

  /* ==========================================================================
   * 五、统计（统计页 / 首页信息卡用）
   * ======================================================================== */

  function tagStats() {
    var map = {};
    allPosts.forEach(function (p) {
      p.tags.forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map)
      .map(function (name) { return { name: name, count: map[name] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  function categoryStats() {
    var map = {};
    allPosts.forEach(function (p) { map[p.category] = (map[p.category] || 0) + 1; });
    return Object.keys(map)
      .map(function (name) { return { name: name, count: map[name] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  function monthlyStats() {
    var map = {};
    allPosts.forEach(function (p) {
      var key = p.year + "-" + (p.month < 10 ? "0" + p.month : p.month);
      if (!map[key]) map[key] = { label: key, year: p.year, month: p.month, count: 0, words: 0 };
      map[key].count += 1;
      map[key].words += p.words;
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }

  function yearlyStats() {
    var map = {};
    allPosts.forEach(function (p) {
      if (!map[p.year]) map[p.year] = { year: p.year, count: 0, words: 0 };
      map[p.year].count += 1;
      map[p.year].words += p.words;
    });
    return Object.keys(map).sort().map(function (y) { return map[y]; });
  }

  function siteStats() {
    var totalWords = allPosts.reduce(function (s, p) { return s + p.words; }, 0);
    var totalRead = allPosts.reduce(function (s, p) { return s + p.readTime; }, 0);
    var tags = tagStats();
    var cats = categoryStats();
    var months = monthlyStats();
    var totalViews = allPosts.reduce(function (s, p) { return s + (p.views || 0); }, 0);

    var first = allPosts.length ? allPosts[allPosts.length - 1].dateObj : new Date();
    var days = Math.max(1, Math.round((Date.now() - first.getTime()) / 86400000));

    return {
      postCount: allPosts.length,
      tagCount: tags.length,
      categoryCount: cats.length,
      noteCount: allNotes.length,
      photoCount: allGallery.length,
      friendCount: allFriends.length,
      logCount: allLogs.length,
      totalWords: totalWords,
      totalReadTime: totalRead,
      totalViews: totalViews,
      avgWords: allPosts.length ? Math.round(totalWords / allPosts.length) : 0,
      avgReadTime: allPosts.length ? Math.round(totalRead / allPosts.length) : 0,
      days: days,
      busiestMonth: months.slice().sort(function (a, b) { return b.count - a.count; })[0] || null,
      longestPost: allPosts.slice().sort(function (a, b) { return b.words - a.words; })[0] || null,
      tags: tags,
      categories: cats,
      months: months,
      years: yearlyStats(),
      firstDate: allPosts.length ? allPosts[allPosts.length - 1].date : "",
      lastDate: allPosts.length ? allPosts[0].date : "",
      /* 有没有内容，页面用它决定显示「空状态」还是正常列表 */
      hasAny: allPosts.length + allNotes.length + allGallery.length + allLogs.length > 0,
    };
  }

  /* ==========================================================================
   * 六、随笔 / 相册 / 友链 / 日志
   * ======================================================================== */
  function notes() { return allNotes.slice(); }
  function gallery() { return allGallery.slice(); }
  function friends() { return allFriends.slice(); }
  function logs() { return allLogs.slice(); }

  function logTypes() {
    var map = {};
    allLogs.forEach(function (l) {
      (l.items || []).forEach(function (item) {
        var t = item.type || "其他";
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map(function (name) { return { name: name, count: map[name] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /* ==========================================================================
   * 七、对外暴露
   * ======================================================================== */
  var ready = load();

  return {
    ready: ready,                 // 页面必须等它：CONTENT.ready.then(...)
    state: state,                 // 连接状态 { loading, ok, configured, message }

    getAll: getAll,
    getLatest: getLatest,
    getBySlug: getBySlug,
    getByTag: getByTag,
    getByCategory: getByCategory,
    getRelated: getRelated,
    getNeighbors: getNeighbors,
    query: query,

    tagStats: tagStats,
    categoryStats: categoryStats,
    monthlyStats: monthlyStats,
    yearlyStats: yearlyStats,
    siteStats: siteStats,

    notes: notes,
    gallery: gallery,
    friends: friends,
    logs: logs,
    logTypes: logTypes,
    toDate: toDate,
  };
})();
