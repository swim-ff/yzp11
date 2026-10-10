# 🏠 我的小窝

> 一个**带数据库和写作后台**的个人博客：**墨绿湖面雨夜首屏 + 宫崎骏草原内页 + 毛玻璃卡片**。
> 前端是纯手写的 HTML / CSS / JavaScript（没有任何框架、不需要构建），
> 数据存在 **Supabase 免费云数据库**里，你在后台点点鼠标就能发文章、传图片。

---

## 🚀 我该从哪里开始？

| 你的情况 | 请打开 |
| --- | --- |
| **第一次用这个网站**（还没连数据库） | 👉 **[新手操作手册.md](新手操作手册.md)** ← 从这里开始，20 分钟就能发第一篇文章 |
| 已经连上数据库，想写文章 | 打开 `你的网址/admin.html`（网站最底部也有「🖋️ 写作后台」的入口） |
| 不知道一篇笔记怎么写 | 看 [示范-一篇好笔记长什么样.md](示范-一篇好笔记长什么样.md) |
| 想把网站放到网上 | 看下面的[部署](#-部署到网上让别人也能访问)一节 |

**一句话流程**：建数据库（Supabase）→ 填密钥（`content/config.js`）→ 建登录账号 → 打开 `/admin.html` 写文章。

---

## ✨ 网站有什么

### 前台（给访客看的）

| 页面 | 说明 |
| --- | --- |
| **主页** | 首屏是墨绿色湖面 + 下雨特效（Canvas 实时绘制：雨丝、雨滴入水的涟漪、水面流动光纹），居中大字「欢迎来到我的小窝」；往下是个人信息卡、最新博文卡片、标签云 |
| **博文** | 卡片列表（封面 + 标题 + 简介 + 发布时间）；支持关键词搜索、分类筛选、标签筛选、三种排序、分页 |
| **博文详情** | markdown 渲染 + 代码高亮 + 一键复制代码 + 右侧目录（滚动自动高亮）+ 浏览量统计 + **评论区** + 上一篇/下一篇 + 相关推荐 |
| **统计** | 数据总览面板 + 手写 SVG 图表：分类柱状图、发布时间趋势图、分类占比环形图、标签 TOP10 |
| **随笔** | 说说式时间线：心情标签、配图（点击放大）、点赞 |
| **相册** | 瀑布流布局 + 点击放大灯箱 |
| **友链** | 卡片式展示 + 交换友链说明 |
| **日志** | 网站更新记录，按时间倒序，支持按类型筛选 |
| **留言板** | 访客留言（**存进数据库**，所有人都能看到） |
| **关于我** | 自我介绍、技能条、成长时间线、联系方式 |

**视觉与动效**：毛玻璃磨砂卡片、圆角、清新柔和配色、卡片悬浮上浮、页面平滑滚动、进入视口淡入、导航滚动变色、阅读进度条、返回顶部。
**所有装饰图片（背景插画、文章封面、默认相册图、头像、图标）都是代码生成的 SVG**，不需要你准备素材，也永远不会出现「图挂了」。

### 后台（只有你能进）

| 标签 | 能做什么 |
| --- | --- |
| 📝 博文 | 写 / 改 / 删文章；上传封面图；正文里插图；markdown 实时预览 |
| 🍃 随笔 | 发短句 + 心情标签 + 最多 3 张配图 |
| 🖼️ 相册 | 上传照片、填标题说明 |
| 🗓️ 更新日志 | 记网站版本变更 |
| 💬 留言 | 查看和删除访客留言、文章评论 |
| 🔗 友链 | 添加朋友的网站 |
| ⚙️ 网站设置 | 改站名、导航菜单、首页欢迎语、个人介绍、技能条、时间线、页脚 |

---

## 📁 目录结构

```text
my-nest/
├── index.html            # 主页（雨夜湖面首屏）
├── posts.html            # 博文列表
├── post.html             # 博文详情（markdown 渲染 + 评论）
├── stats.html            # 数据统计（图表）
├── essays.html           # 随笔
├── gallery.html          # 相册
├── friends.html          # 友链
├── log.html              # 更新日志
├── guestbook.html        # 留言板
├── about.html            # 关于我
├── admin.html            # ★ 写作后台（发文章都在这里）
│
├── content/
│   ├── config.js         # ★★ 你要填的唯一一个文件：数据库网址和密钥
│   ├── site.js           # 网站默认文案（数据库没设置时兜底，一般不用改）
│   ├── posts.js          # 占位文件（内容都在数据库里）
│   ├── moments.js        # 占位文件
│   └── logs.js           # 占位文件
│
├── assets/
│   ├── css/style.css     # 全站样式（按 19 个模块分区，注释齐全）
│   ├── admin/
│   │   ├── admin.js      # 后台的全部逻辑
│   │   └── admin.css     # 后台专用样式（不影响前台）
│   ├── js/
│   │   ├── store.js      # 数据库连接层（读写、登录、上传图片）
│   │   ├── loader.js     # 内容加工与统计
│   │   ├── main.js       # 前台页面渲染入口
│   │   ├── app.js        # 导航、页脚、滚动交互
│   │   ├── ui.js         # SVG 插画生成 + 通用工具
│   │   ├── markdown.js   # 手写 markdown 渲染器
│   │   ├── highlight.js  # 手写代码高亮
│   │   ├── charts.js     # 手写 SVG 图表
│   │   └── rain.js       # 首页雨夜特效
│   ├── img/              # 背景插画、默认头像、图标（都是 SVG）
│   └── lib/              # 【可选】把 Supabase 库放这里就能离线用
│
├── supabase/
│   └── schema.sql        # ★ 建表脚本（复制到 Supabase 的 SQL Editor 里执行）
│
├── 新手操作手册.md        # ★ 你最先要看的东西
├── 示范-一篇好笔记长什么样.md
├── README.md             # 本文件
├── .github/workflows/deploy-pages.yml   # GitHub Pages 自动部署
├── .nojekyll · robots.txt · sitemap.xml · feed.xml
```

---

## 💻 本地预览

**方式 1：直接双击 `index.html`**（最简单，所有功能都能用）

**方式 2：起一个本地服务器**（推荐，和线上环境一致）
```bash
python -m http.server 8080     # 然后打开 http://localhost:8080
```

**方式 3：VS Code** 装 **Live Server** 插件 → 右键 `index.html` → Open with Live Server

后台地址：本地直接打开 `admin.html`，线上是 `你的网址/admin.html`。

---

## 🗄 数据库（Supabase）说明

### 数据表一览

| 表名 | 存什么 |
| --- | --- |
| `posts` | 文章（标题、日期、分类、标签、简介、封面、markdown 正文、浏览量、是否发布） |
| `notes` | 随笔（日期、心情、正文、配图） |
| `gallery` | 相册（标题、日期、图片地址、说明） |
| `friends` | 友链 |
| `logs` | 更新日志 |
| `comments` | 留言和文章评论（用 `post_slug` 区分是哪篇文章，`guestbook` 表示留言板） |
| `site_config` | 网站设置（整个网站只有一行，用一个 JSON 存全部设置） |
| `admins` | 管理员名单（新注册的账号自动加入） |
| `storage.objects`（`post-images` 桶） | 你上传的所有图片 |

### 权限是怎么保护的

| 操作 | 谁能做 |
| --- | --- |
| 看文章、随笔、相册、友链、日志 | 所有人（包括没登录的访客） |
| 发文章、改设置、上传图片、删留言 | **只有登录了的你** |
| 提交留言 / 评论 | 所有人（但只能新增、不能改别人的；有长度限制防垃圾） |
| 看未审核的留言 | 只有你（把 `comments.approved` 改成 `false` 就能先审后发） |

这些规则写在 `supabase/schema.sql` 里（叫做 Row Level Security），
所以**就算别人看到你网页里的密钥，他也改不了你的任何内容**，只能看。

### 想自己看数据库？

Supabase 左侧菜单 → **Table Editor**，就能像 Excel 一样看每张表的数据，
也可以直接在里面改（比如把某篇文章的 `published` 改成 `false`，它就变成草稿，前台看不到）。

---

## 🌐 部署到网上（让别人也能访问）

### GitHub Pages（免费，推荐）

```bash
# 在项目目录里，把代码推上 GitHub
git init
git add .
git commit -m "我的小窝"
git branch -M main
git remote add origin https://github.com/你的用户名/my-nest.git
git push -u origin main
```

然后：仓库 → **Settings** → **Pages** → **Source** 选 **GitHub Actions**。
本项目已带好工作流文件，等 1~2 分钟访问 `https://你的用户名.github.io/my-nest/`。

> 也可以选 **Deploy from a branch** → 分支 `main` → 目录 `/ (root)`，两种方式二选一。

### 其他平台

| 平台 | 怎么部署 | 特点 |
| --- | --- | --- |
| **Netlify** | 把文件夹拖到 <https://app.netlify.com/drop> | 10 秒出网址，最快 |
| **Cloudflare Pages** | 连 Git 仓库，Build command 留空，输出目录 `/` | 国内访问通常更快 |
| **Vercel** | 导入仓库，Framework 选 Other，输出目录 `.` | 界面友好 |
| **宝塔 / 自己的服务器** | 把整个目录传到网站根目录 | 无需 Node，Nginx 直接就能跑 |

**部署完成后记得做两件事：**
1. Supabase → **Authentication** → **URL Configuration** → Site URL 填你的网站地址
2. 后台 → 网站设置 → 把「网站网址」填上你的域名

---

## ❓ 常见问题

**Q：我需要会写代码吗？**
A：不需要。日常使用只需要打开后台点鼠标。只有想改配色、改背景的时候才需要动 CSS，下面有说明。

**Q：要花钱吗？**
A：不用。Supabase 免费版（500MB 数据库 + 1GB 图片存储）和 GitHub Pages 都免费，个人博客用几年都用不完。

**Q：文章会不会丢？**
A：存在 Supabase 云端，换电脑也能继续写。免费版有自动备份（Database → Backups）。重要文章建议自己再存一份到笔记软件。

**Q：Supabase 免费项目会被暂停吗？**
A：如果**连续 7 天完全没有访问**，它会被暂停（不是删除）。你登录一下 Supabase 就能恢复。

**Q：留言是真的存到服务器了吗？**
A：是的，留言和评论都存进数据库了，**所有人刷新页面都能看到**。删除只有你能做。

**Q：想换头像 / 换背景 / 换配色？**
- 头像：后台 → 网站设置 → 上传
- 背景插画：替换 `assets/img/scene-grassland.svg`，或改 `assets/css/style.css` 里的 `.bg-scene`
- 配色：`assets/css/style.css` 最上面的 `:root` 变量（改 `--c-lake-500` 主色、`--glass-bg` 透明度等）

**Q：不用数据库行不行？**
A：可以，但需要改 `loader.js`。`content/posts.js` 里留了说明和格式示例，不建议新手这么做。

**Q：想加一个新页面（比如「项目」）？**
A：复制 `friends.html` 改名 → 改 `data-page` 和标题 → 在 `content/site.js` 的 `nav` 数组加一项 → 在 `assets/js/main.js` 里照着 `Friends` 模块写一个新的渲染函数并注册进 `ROUTES`。

---

## 🧰 技术栈

原生 HTML5 · CSS3（变量 / `backdrop-filter` / Grid）· 原生 JavaScript（无框架、无构建）·
Canvas 2D（雨夜特效）· 手写 markdown 渲染器 · 手写代码高亮 · 手写 SVG 图表 ·
Supabase（PostgreSQL 数据库 + Auth 登录 + Storage 图片存储）· 行级安全策略（RLS）

浏览器支持：Chrome / Edge 88+、Firefox 103+、Safari 15.4+。
更老的浏览器会把毛玻璃降级成普通半透明卡片，内容依然可读。

---

## ⚠️ 给以后改代码的你的一个提醒

网站的所有文件都是 **UTF-8 编码**，页面里也写了 `<meta charset="UTF-8">`。

如果你用 **PowerShell** 批量改这些文件，**一定要显式指定编码**，否则中文会变成乱码：

```powershell
# ✅ 正确：明确按 UTF-8 读写
Get-Content file.html -Raw -Encoding UTF8 | Set-Content file.html -Encoding UTF8

# ❌ 错误：不写 -Encoding，PowerShell 会按系统默认编码（中文 Windows 是 GBK）处理，
#          中文会被写坏，而且部分字符无法还原
Get-Content file.html -Raw | Set-Content file.html
```

用记事本、VS Code、Typora 等编辑器保存时，也确认编码是 **UTF-8**（VS Code 右下角可以看到）。

---

## 📄 许可

代码随意使用和修改；网站内容请放你自己的东西。

祝你写出满满一整个小窝的笔记 🌱
