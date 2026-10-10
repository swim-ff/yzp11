/**
 * ============================================================================
 *  网站默认设置 · content/site.js
 * ----------------------------------------------------------------------------
 *  【这个文件还需要改吗？】
 *  不需要。你的网站设置（站名、导航菜单、首页欢迎语、个人介绍……）
 *  现在都存在数据库里，登录后台 → 「网站设置」就能改，改完刷新网页就变。
 *
 *  【那这个文件是干什么的？】
 *  它是「兜底默认值」：当数据库还没连上、或者后台里某项你还没填的时候，
 *  网站就显示这里的内容，这样页面不会出现空白和报错。
 *
 *  想改导航菜单？也建议在后台改（「网站设置 → 导航菜单」），见下方说明。
 * ============================================================================
 */
window.SITE = {
  /* ---------- 基本信息 ---------- */
  name: "我的小窝",                       // 站名（浏览器标签页和导航栏左上角）
  slogan: "愿你在代码与星光之间，找到属于自己的小窝",
  description: "一个学生的编程与学习笔记小站。",
  url: "",                                // 部署后的网址，填了有利于分享卡片
  since: new Date().getFullYear(),        // 建站年份，页脚会显示 © 年份 - 今年
  icp: "",                                // 备案号，没有就留空

  /* ---------- 顶部导航菜单 ----------
   * 后台「网站设置 → 导航菜单」可以改这里的文字和图标；
   * 如果你要新增一个全新的页面，才需要在这里加一行。
   * href 是页面文件名，icon 是任意 emoji。
   */
  nav: [
    { href: "index.html", label: "主页", icon: "🏠" },
    { href: "posts.html", label: "博文", icon: "📚" },
    { href: "stats.html", label: "统计", icon: "📊" },
    { href: "essays.html", label: "随笔", icon: "🍃" },
    { href: "gallery.html", label: "相册", icon: "🖼️" },
    { href: "friends.html", label: "友链", icon: "🔗" },
    { href: "log.html", label: "日志", icon: "🗓️" },
    { href: "guestbook.html", label: "留言板", icon: "💬" },
    { href: "about.html", label: "关于我", icon: "🌸" },
  ],

  /* ---------- 首页首屏 ---------- */
  hero: {
    eyebrow: "Nice to meet you · 欢迎光临",
    title: "欢迎来到我的小窝",            // 首屏那几个大字
    subtitle: "这里存放我的学习笔记。随便逛逛吧。",
    primaryBtn: { label: "📖 开始阅读", href: "posts.html" },
    secondaryBtn: { label: "🌸 认识一下", href: "about.html" },
    /* 雨夜特效参数：intensity 是雨量（0.5 小雨 / 1 中雨 / 1.8 暴雨），
       ripple 是涟漪多少，windX 是风向（负数往左吹） */
    rain: { intensity: 1, ripple: 1, windX: -0.14, showMist: true },
  },

  /* ---------- 个人信息（首页那张卡片 / 关于页 / 页脚） ---------- */
  profile: {
    name: "小窝主人",
    avatar: "assets/img/avatar.svg",       // 想换头像：把照片放进 assets/img/，改这里
    role: "大学生",                        // 一句话身份，比如「计算机专业大一学生」
    bio: "",                               // 一句话自我介绍
    intro: "",                             // 关于页里更长的自我介绍
    location: "",
    socials: [],                           // 社交链接，格式见文末注释
    status: { emoji: "🌱", text: "" },     // 当前状态，比如「正在学 Python」
    welcome: "",                           // 留言板顶部的站长留言
  },

  /* ---------- 关于我页面的技能条 / 时间线 ---------- */
  about: {
    skills: [],      // [{ name: "Python", level: 40 }]
    timeline: [],    // [{ year: "2025", text: "开始学编程" }]
    interests: "",   // 兴趣爱好
  },

  /* ---------- 页脚 ---------- */
  footer: {
    links: [
      { href: "about.html", label: "关于我" },
      { href: "guestbook.html", label: "留言板" },
      { href: "log.html", label: "更新日志" },
    ],
    note: "本站使用原生 HTML + CSS + JavaScript 手写，内容存放在 Supabase 数据库。",
  },
};

/* ============================================================================
 *  附：几个字段的填写格式（以后想直接改这个文件时参考）
 * ----------------------------------------------------------------------------
 *  社交链接 socials：
 *    socials: [
 *      { label: "GitHub", href: "https://github.com/你的用户名", icon: "🐙" },
 *      { label: "邮箱",   href: "mailto:你的邮箱@example.com",   icon: "✉️" },
 *    ]
 *
 *  技能条 skills（level 是 0~100 的百分比）：
 *    skills: [
 *      { name: "Python", level: 40 },
 *      { name: "C 语言", level: 35 },
 *    ]
 *
 *  成长时间线 timeline：
 *    timeline: [
 *      { year: "2025", text: "进入大学计算机专业，开始学编程。" },
 *      { year: "2026", text: "学会了写博客。" },
 *    ]
 * ============================================================================
 */
