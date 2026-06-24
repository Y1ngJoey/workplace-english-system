# 外贸英语工作台

Phase 1 已实现：登录后的对内练习工作台，包含今日、语料库、每周复盘、语音陪练、成长记录、设置/导出导入。项目不包含支付、电商、订单、会员、社群打卡等卖货功能。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui 风格组件
- Supabase Auth / Postgres / RLS
- dnd-kit 拖拽排序

## 本地运行

1. 安装依赖：

```bash
pnpm install
```

2. 创建 `.env.local`：

```bash
cp .env.example .env.local
```

填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

3. 初始化 Supabase：

在 Supabase SQL Editor 依次执行：

```sql
-- 先执行
supabase/schema.sql

-- 再执行
seed.sql
```

如果后续 Phase 2 要读取 `leads`，先注册登录一次，然后在 SQL Editor 里把自己的 `auth.users.id` 加入：

```sql
insert into public.app_admins (user_id)
values ('你的 auth.users.id');
```

4. 启动：

```bash
pnpm dev
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。

## Phase 1 验收

- 注册/登录后进入 `/app/today`，今日打卡会写入 `daily_logs`，刷新不丢。
- 在语料库点击「新增语料」，确认是 modal；保存后列表出现；可筛选、搜索、编辑、删除、改掌握度、标记复习。
- 在语料库点击「转为选题 → 对外」，会写入 `idea_bank`，Phase 2 的选题页会继续读取。
- 每周复盘会按周一创建唯一 `weekly_reviews`；顶部汇总可重新计算/手改保存。
- 每周复盘条目可直接编辑，失焦/防抖保存；同一板块内拖拽排序后刷新仍保持；可增删条目。
- 语音陪练显示开场咒语和 8 个内置剧本；每个剧本可复制，内置剧本可收藏为私人副本，可新增自定义剧本。
- 成长记录可保存录音/视频链接、里程碑、反思。
- 设置页可调整每日目标；可导出 JSON、导出关键 CSV、导入 JSON 恢复。

## 数据文件

- `supabase/schema.sql`：全部表、索引、RLS、leads 特殊 RLS。
- `seed.sql`：第 7 节全部内置 templates、glossary、grammar_points、roleplay_scripts。
- `.env.example`：本地环境变量模板。

## GitHub

本地仓库已绑定：

```bash
origin https://github.com/Y1ngJoey/workplace-english-system.git
```

当前开发分支：

```bash
codex/phase-1-workbench
```

本机缺少 GitHub HTTPS 凭据时，`git push` 会提示无法读取用户名。登录 GitHub 凭据后执行：

```bash
git push -u origin codex/phase-1-workbench
```
