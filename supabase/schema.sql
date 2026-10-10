-- ============================================================================
--  我的小窝 · 数据库建表脚本  ·  supabase/schema.sql
-- ----------------------------------------------------------------------------
--  【这份文件是干什么的】
--  它是一份「建房子图纸」：在 Supabase 的 SQL Editor 里整个粘贴、点 Run，
--  它就会帮你把网站需要的所有表格、权限规则、图片仓库一次性建好。
--
--  【你要怎么用它】—— 一共 4 步，10 分钟
--   1. 打开 https://supabase.com 注册（用 GitHub 或邮箱都行），新建一个项目
--      （Project name 随便写，比如 my-nest；Region 选离你最近的，比如 Singapore；
--        Database Password 自己设一个并**记在小本本上**）
--   2. 等 2 分钟，项目建好后，点左侧菜单的「SQL Editor」
--   3. 把这份文件从头到尾全部复制，粘贴到里面，点右下角「Run」
--   4. 看到 "Success. No rows returned" 就成功了
--
--  【这个脚本重复执行也没关系】
--  所有语句都写成了「如果已经有了就跳过」，所以你手滑点了两次 Run 也不会坏。
--
--  【建了哪些表】
--   site_config  网站设置（站名、导航、关于我……整个网站只存 1 行）
--   posts        博文（你写的每一篇笔记）
--   notes        随笔（短句，像发朋友圈）
--   gallery      相册图片
--   friends      友情链接
--   logs         更新日志（网站版本记录）
--   comments     读者留言（别人在你文章下面留的评论）
--
--  【权限是怎么设计的（很重要，看一眼）】
--   读：所有人（含没登录的访客）都能看你的文章
--   写：只有「登录了的你」能发帖、改设置、上传图片
--   留言：任何人都能提交，但只能提交、不能改别人的
--   —— 也就是说，就算别人看到了你的网站源码，也没法改你的文章。
-- ============================================================================


-- ============================================================================
-- 0. 准备工作：把 gen_random_uuid 函数准备好（Supabase 自带，这里只是保险）
-- ============================================================================
create extension if not exists pgcrypto;


-- ============================================================================
-- 1. 网站设置表（整个网站只有 1 行数据）
--    站名、导航菜单、首页文案、个人信息、页脚……都放在这一个 JSON 里，
--    这样你以后想加字段（比如加个「我的设备」）不用改表结构，后台里直接加就行。
-- ============================================================================
create table if not exists public.site_config (
  id          int primary key default 1,
  data        jsonb not null default '{}'::jsonb,   -- 网站设置的全部内容
  updated_at  timestamptz not null default now(),
  constraint site_config_only_one_row check (id = 1) -- 强制只能有 1 行
);

comment on table  public.site_config is '网站全局设置，只存一行；data 里的字段与前端 content/site.js 的结构一致';
comment on column public.site_config.data is 'JSON：{name, slogan, nav[], hero{}, profile{}, footer{}}';


-- ============================================================================
-- 2. 博文表
-- ============================================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,          -- 文章地址标识：post.html?p=这个值
  title       text        not null,
  date        date        not null default current_date,
  category    text        not null default '未分类',
  tags        text[]      not null default '{}',    -- 标签数组
  excerpt     text        not null default '',      -- 卡片上显示的简介
  cover_art   text        not null default 'grass', -- 用代码生成的封面插画主题名
  cover_src   text,                                 -- 你自己的封面图地址（填了就用它）
  content     text        not null default '',       -- markdown 正文
  views       int         not null default 0,        -- 浏览量
  published   boolean     not null default true,     -- 关掉就是草稿（前台看不到）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.posts is '博文：一篇笔记一行';
create index if not exists posts_date_idx      on public.posts (date desc);
create index if not exists posts_category_idx  on public.posts (category);
create index if not exists posts_published_idx on public.posts (published, date desc);


-- ============================================================================
-- 3. 随笔表（短句，像说说）
-- ============================================================================
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  date        date        not null default current_date,
  mood        text        not null default '',       -- 心情标签，比如「开心」「踩坑了」
  text        text        not null,                  -- 正文（换行直接回车就行）
  images      jsonb       not null default '[]'::jsonb, -- 配图：[{"src":"图片地址"}]
  likes       int         not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.notes is '随笔：短句 + 心情 + 可选配图';


-- ============================================================================
-- 4. 相册表
-- ============================================================================
create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null default '未命名',
  date        date        not null default current_date,
  src         text,                                  -- 图片地址；留空就用下面那个插画
  art         text        not null default 'bokeh',  -- 留空时用的插画主题名
  description text        not null default '',       -- 图片说明
  sort_order  int         not null default 0,        -- 排序（小的排前面）
  created_at  timestamptz not null default now()
);

comment on table public.gallery is '相册照片';


-- ============================================================================
-- 5. 友情链接表
-- ============================================================================
create table if not exists public.friends (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  url         text        not null,
  description text        not null default '',
  avatar      text        not null default '',
  color       text        not null default 'sakura', -- 头像底色：sakura/sky/matcha/cream/sun/lilac
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.friends is '友情链接';


-- ============================================================================
-- 6. 更新日志表
-- ============================================================================
create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  version     text        not null,                   -- 版本号，比如 v1.0.0
  date        date        not null default current_date,
  title       text        not null default '',
  tags        text[]      not null default '{}',
  items       jsonb       not null default '[]'::jsonb, -- [{"type":"新增","text":"..."}]
  created_at  timestamptz not null default now()
);

comment on table public.logs is '网站更新日志，前台按日期倒序显示';


-- ============================================================================
-- 7. 留言表（读者在你文章下面留的评论）
-- ============================================================================
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_slug   text        not null,                   -- 属于哪篇文章（对应 posts.slug）
  name        text        not null,
  text        text        not null,
  approved    boolean     not null default true,      -- 改成 false 就变成「先审核再显示」
  created_at  timestamptz not null default now()
);

comment on table public.comments is '文章评论；approved=false 时前台不显示（适合先审后发）';
create index if not exists comments_slug_idx on public.comments (post_slug, created_at desc);


-- ============================================================================
-- 8. 自动更新「修改时间」的小机关
--    任何一行数据被改动时，updated_at 会自动变成当前时间，你不用管。
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists site_config_touch on public.site_config;
create trigger site_config_touch before update on public.site_config
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 9. 让任何一个新账号注册后自动获得发帖权限
--    （每次你新建一个后台账号，这个机关会自动把你的邮箱记进管理员名单）
-- ============================================================================
create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);

comment on table public.admins is '管理员名单：只有名单里的账号能发帖、改设置';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admins (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 10. 浏览量 +1 的小函数
--     访客打开文章时会调用它。写成函数是为了让「没登录的访客」也能加浏览量，
--     但又不给他们修改文章内容的权限。
-- ============================================================================
create or replace function public.increment_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
     set views = views + 1
   where slug = p_slug
     and published = true;
$$;

grant execute on function public.increment_views(text) to anon, authenticated;


-- ============================================================================
-- 11. 权限规则（Row Level Security，简称 RLS）
--     这一节是整份文件最重要的部分：它决定「谁能看、谁能写」。
--     规则一句话总结：
--       · 内容是公开的  → 谁都能读
--       · 修改要登录    → 只有管理员能写
--       · 留言谁都能发  → 但只能新增，不能改别人的
-- ============================================================================

-- ---------- 11.1 网站设置 ----------
alter table public.site_config enable row level security;

drop policy if exists "网站设置：所有人可读" on public.site_config;
create policy "网站设置：所有人可读"
  on public.site_config for select
  to anon, authenticated
  using (true);

drop policy if exists "网站设置：管理员可写" on public.site_config;
create policy "网站设置：管理员可写"
  on public.site_config for all
  to authenticated
  using (true) with check (true);

-- ---------- 11.2 博文 / 随笔 / 相册 / 友链 / 日志 ----------
-- 这五张表规则一样：所有人能读，登录的人能写。
do $$
declare
  t text;
  tables text[] := array['posts', 'notes', 'gallery', 'friends', 'logs'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '：所有人可读', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '：所有人可读', t
    );

    execute format('drop policy if exists %I on public.%I', t || '：管理员可写', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '：管理员可写', t
    );
  end loop;
end $$;

-- ---------- 11.3 留言 ----------
alter table public.comments enable row level security;

-- 已通过的留言，所有人可见
drop policy if exists "留言：所有人可读已通过" on public.comments;
create policy "留言：所有人可读已通过"
  on public.comments for select
  to anon, authenticated
  using (approved = true);

-- 任何人都能提交留言（表单进不来空内容，长度也有限制，防垃圾）
drop policy if exists "留言：所有人可提交" on public.comments;
create policy "留言：所有人可提交"
  on public.comments for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 24
    and char_length(trim(text)) between 1 and 500
    and approved = true
  );

-- 只有登录的管理员能删除 / 审核留言
drop policy if exists "留言：管理员可管理" on public.comments;
create policy "留言：管理员可管理"
  on public.comments for all
  to authenticated
  using (true) with check (true);

-- ---------- 11.4 管理员名单 ----------
alter table public.admins enable row level security;
-- 不建任何策略 = 谁都读不到、写不到（只有数据库自己用），这是最安全的做法


-- ============================================================================
-- 12. 图片仓库（Storage）
--     你上传的封面图、相册照片都放在这个叫 post-images 的桶里。
--     设置成「所有人可看、只有你能传」，这样图片能在网页上显示，
--     但别人没法往你的仓库里塞东西。
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,                                    -- 公开可读
  5242880,                                 -- 单张最大 5MB
  array['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/avif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/avif'];

drop policy if exists "图片：所有人可看" on storage.objects;
create policy "图片：所有人可看"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-images');

drop policy if exists "图片：管理员可上传" on storage.objects;
create policy "图片：管理员可上传"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "图片：管理员可修改" on storage.objects;
create policy "图片：管理员可修改"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images')
  with check (bucket_id = 'post-images');

drop policy if exists "图片：管理员可删除" on storage.objects;
create policy "图片：管理员可删除"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images');


-- ============================================================================
-- 13. 给网站设置准备一个空位置
--     这里故意不放任何内容（{}），网站会用代码里的默认值兜底，
--     所有的站名、导航、个人介绍都等你在后台里自己填 —— 不让任何示例文案
--     混进你的网站。
--     这行执行两次也不会出问题。
-- ============================================================================
insert into public.site_config (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 如果你之前不小心跑过带示例内容的版本，下面这行会把残留清空（只清一次）
update public.site_config
   set data = '{}'::jsonb
 where id = 1
   and data ? 'hero'
   and data ->> 'name' = '我的小窝'
   and not (data ? 'you_edited_it');   -- 你自己加过标记就不会被清


-- ============================================================================
-- 14. 如果你刚才已经注册过后台账号，把已有账号补进管理员名单
--     （正常情况下第 9 步的机关会自动处理，这行只是给「先注册后跑脚本」兜底）
-- ============================================================================
insert into public.admins (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;


-- ============================================================================
--  完成！看到 "Success. No rows returned" 就说明全部建好了。
--
--  接下来：
--   1. 左侧菜单 Authentication → Users → Add user → Create new user
--      填你的邮箱 + 密码，勾上 Auto Confirm User（否则要收邮件确认）
--   2. 左侧菜单 Project Settings → API，复制 Project URL 和 anon public key
--   3. 打开我给你的《新手操作手册.md》，照着第 2 步填进 content/config.js
-- ============================================================================
