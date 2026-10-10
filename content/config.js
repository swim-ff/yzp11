/**
 * ============================================================================
 *  ⚙️ 数据库连接设置 · content/config.js
 * ----------------------------------------------------------------------------
 *  【你只需要改这一个文件就能让网站连上数据库】
 *
 *  怎么填？—— 三步，照着做就行：
 *
 *   第 1 步：打开你的 Supabase 项目网页
 *            （https://supabase.com → 登录 → 点进你的项目）
 *
 *   第 2 步：点左下角的齿轮 ⚙ Project Settings → 左侧选「API」
 *
 *   第 3 步：在那一页里找到这两个东西，复制过来粘到下面：
 *            · Project URL        → 粘到下面的 url
 *            · anon / public key  → 粘到下面的 anonKey
 *            （注意是 anon public 那一串，很长，以 eyJ 开头；
 *              千万不要填 service_role 那一串，那个是最高权限，不能放网页里）
 *
 *  填好之后保存，刷新网站就生效了。
 *
 *  ---------------------------------------------------------------
 *  【安全吗？】
 *  安全。anon key 是设计成可以公开的（它会被写进网页，任何人都能看到）。
 *  真正保护你网站的是数据库里的「权限规则」（在 supabase/schema.sql 里），
 *  那些规则规定：只有登录了的你才能发帖、改内容，别人只能看。
 *  所以就算有人看到这串 key，他也改不了你的任何东西。
 *  ---------------------------------------------------------------
 *
 *  【还没填会怎样？】
 *  网站照样能打开，只是所有列表都会显示「还没有内容」，
 *  并提示你数据库还没连接。等你填好这里，内容就出现了。
 * ============================================================================
 */
window.NEST_CONFIG = {
  /* ↓↓↓ 把 Supabase 的 Project URL 粘到这里（形如 https://abcdefgh.supabase.co） ↓↓↓ */
  url: "https://tovdybdubqndbbwkklye.supabase.co",

  /* ↓↓↓ 把 Supabase 的 anon public key 粘到这里（很长，以 eyJ 开头） ↓↓↓ */
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdmR5YmR1YnFuZGJid2trbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MTM2MTksImV4cCI6MjEwNzE4OTYxOX0.1Yi1UXGBwBfz2XkSDRtk24K5H2g10TvhFh27MigXJdE",

  /* 图片仓库的名字（跟着 supabase/schema.sql 建的，一般不用改） */
  bucket: "post-images",
};
