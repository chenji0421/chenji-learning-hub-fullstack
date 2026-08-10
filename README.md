# 沉积 Learning Hub Fullstack

这是 **沉积 Learning Hub 的全栈版本**——一个可以用 GitHub 登录的个人博客 / 学习工作台。

> ✅ **已上线**：https://chenji.felixfu.xyz
> GitHub OAuth 登录可用，`chenji0421` 可以进入管理后台；GitHub Actions 自动部署、Docker / Nginx 部署流程均已跑通。

- **访客**：无需登录即可查看文章、公开计划（年表 / 月表 / 日计划）
- **站长**：通过 **GitHub OAuth** 登录后，可以在网站上**直接写文章、修改计划**，不用再改代码
- 本地开发用 **SQLite**，数据存在本地文件；线上部署使用 **Render PostgreSQL**，文章和计划保存在**服务器数据库**里，**不依赖浏览器 localStorage**

> 项目只有真实内容：数据库初始为空，不生成假文章、假计划、假浏览量、假点赞、假评论。
>
> 📜 版本变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 功能模块

| 模块 | 说明 |
|---|---|
| **GitHub 登录** | 通过 GitHub OAuth 授权登录，后端签发 JWT；仅管理员（默认 `chenji0421`）可管理内容 |
| **管理员后台** | 面板化工作台：总览 / 写文章 / 内容库 / 计划管理 / 运维状态；非管理员 / 未登录用户无法进入 |
| **文章管理** | 新增 / 编辑 / 删除文章，可存草稿或发布；草稿不会出现在访客文章页 |
| **技术笔记** | 与普通文章共用模型，按分类「技术笔记 / 笔记」归入独立中心 |
| **计划管理** | 新增 / 编辑 / 删除每日计划，支持年表 / 月表 / 日计划三视图；顶部为「Learning Sprint」冲刺计划 Hero 与真实完成度统计 |
| **音乐台** | 个人音乐台：当前播放卡片、进度条、歌单管理（数据存 localStorage）；默认无音乐显示空状态 |
| **工具箱** | 沉积学习与维护工具箱：项目入口 / 内容维护 / 常用命令 / 故障排查 / 学习资料 / 进阶参考 |
| **游戏** | 小游戏入口（暂为空状态，预留 iframe 容器） |
| **更新日志** | 时间线展示每一次版本演进（`/#/changelog`），首页与后台同步显示当前版本 |
| **账号中心** | 查看当前用户、GitHub 用户名、角色（admin / reader），支持退出登录 |
| **访客浏览** | 免登录查看首页、文章、技术笔记、公开计划、工具箱、游戏、音乐台 |

---

## 功能一览

| 角色 | 能做什么 |
|---|---|
| **访客** | 查看文章（仅已发布）、查看公开计划（年表 / 月表 / 日计划） |
| **站长**（GitHub 用户名 = `ADMIN_GITHUB_LOGIN`） | 登录后：新增 / 编辑 / 删除文章（可存草稿 / 发布）、新增 / 修改 / 删除每天的计划 |

权限**由后端判断**：写接口全部校验 JWT + 管理员身份，前端不做任何密码判断。

## 版本记录

网站内置「更新日志」页面，路径：**`/#/changelog`**，集中记录每一次版本演进（首页「最近更新」与管理后台运维状态同步显示当前版本）。数据维护在 `frontend/src/data/changelog.js`，手动更新，不做自动生成。

版本号采用：**`v主版本.功能版本.修复版本`**

- 大功能或架构变化：提升主版本，例如 `v2.0.0`
- 新增功能模块：提升功能版本，例如 `v1.4.0`
- 修复问题或小优化：提升修复版本，例如 `v1.4.1`

示例：新增更新日志页面 → `v1.4.0`；修复计划页白屏 → `v1.3.3`；微调按钮样式 → `v1.3.4`。

## 技术栈

| 层 | 技术 |
|---|---|
| Frontend | React + Vite（线上托管于 Vercel） |
| Backend | FastAPI（线上托管于 Render / 服务器） |
| Database | 本地 SQLite · 线上 Render PostgreSQL |
| Auth | GitHub OAuth + JWT |
| Deploy | GitHub Actions + Docker / Nginx（服务器） |

## 目录结构

```
chenji-learning-hub-fullstack/
├── .github/workflows/        # GitHub Actions
│   ├── ci.yml                # CI：后端 compileall + 前端 build + compose 校验
│   └── deploy.yml            # CD：push 到 main 自动 SSH 部署到服务器
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # 应用入口
│   │   ├── config.py         # 配置（读 .env）
│   │   ├── database.py       # SQLite / PostgreSQL 连接
│   │   ├── models.py         # SQLAlchemy 模型
│   │   ├── schemas.py        # Pydantic 模型
│   │   ├── auth.py           # GitHub OAuth + JWT
│   │   └── routers/          # 路由
│   │       ├── auth.py
│   │       ├── articles.py
│   │       ├── plans.py
│   │       └── health.py
│   └── requirements.txt
├── frontend/                 # React + Vite 前端
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx           # 极简 hash 路由 + 登录态 + 主题 / 侧边栏状态
│   │   ├── api.js            # 请求封装
│   │   ├── data.js           # 静态数据（工具箱入口等）
│   │   ├── styles.css
│   │   └── pages/
│   │       ├── Home.jsx      # 首页（hero + 状态卡 + 最近内容）
│   │       ├── Articles.jsx  # 文章中心
│   │       ├── Notes.jsx     # 技术笔记
│   │       ├── ArticleDetail.jsx
│   │       ├── Plans.jsx     # 计划（年表 / 月表 / 日计划）
│   │       ├── Toolbox.jsx   # 工具箱
│   │       ├── Game.jsx      # 游戏（空状态）
│   │       ├── Account.jsx   # 账号中心
│   │       ├── Login.jsx
│   │       └── Admin.jsx     # 管理后台（面板化标签页）
│   ├── index.html
│   ├── vercel.json         # Vercel 部署配置（指定前端目录与构建命令）
│   ├── vite.config.js
│   └── package.json
├── deploy/                   # Docker / Nginx 部署配置
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── frontend.nginx.conf
│   ├── nginx-host-example.conf
│   └── SERVER_DEPLOY.md
├── docs/                     # 维护文档
│   ├── README.md             # 文档导航
│   └── guides/               # 6 篇指南（GitHub 登录、自动部署、云部署、数据库、备份恢复、运维）
├── scripts/                  # 数据备份 / 恢复脚本
│   ├── backup_db.py          # 备份 chenji_hub.db 到 backups/
│   └── restore_db.py         # 从 backups/ 恢复数据库
├── backups/                  # 数据库备份目录（脚本自动生成，已 gitignore）
├── docker-compose.server.yml # 服务器 Docker Compose
├── render.yaml               # Render 部署配置（后端服务 + PostgreSQL）
├── .env.example              # 环境变量模板（密钥不提交）
├── .gitignore
└── README.md
```

---

## 本地启动

需要先配置好 GitHub OAuth，再启动后端和前端两个进程。

### 0. 环境要求

- **Node.js** 18+（前端）
- **Python** 3.10+（后端，代码用了 `str | None` 等新语法）
- 也可以用 [uv](https://docs.astral.sh/uv/) 管理 Python：`uv venv --python 3.12`

### 1. 创建 GitHub OAuth App

1. 打开 GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**
2. Homepage URL：`http://localhost:5173`
3. Authorization callback URL：`http://localhost:8000/api/auth/github/callback`
4. 创建后记下 **Client ID** 和 **Client Secret**

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入真实的值（每个变量的含义见下方「环境变量说明」）。

### 3. 启动后端

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/api/health

> 用 uv 的话：`cd backend && uv venv --python 3.12 && uv pip install -r requirements.txt && uv run uvicorn app.main:app --reload`

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

开发时 Vite 会把 `/api` 代理到 `http://localhost:8000`，无需额外配置。

---

## 数据保存在哪里

### 本地开发：SQLite 数据库文件

本地跑开发服时，文章、计划、用户信息（GitHub 登录账号）全部保存在 **SQLite 数据库文件**里：

- **文件位置**：`backend/chenji_hub.db`
- **三张表**：
  - `articles` —— 文章（含草稿 / 已发布）
  - `plans` —— 每日计划
  - `users` —— GitHub 登录用户

`DATABASE_URL` 默认是 `sqlite:///./chenji_hub.db`，在 `backend/` 目录下启动后端时，
文件就落在 `backend/chenji_hub.db`。本地不需要额外的数据库服务，表在启动时自动创建。

### 线上：服务器数据库（PostgreSQL）

线上部署时，文章和计划保存在**服务器数据库**（Render PostgreSQL）里，
通过 `DATABASE_URL` 环境变量连接，**不依赖浏览器 localStorage**。
任何电脑、任何浏览器打开 https://chenji.felixfu.xyz 都能看到同一份数据，
管理后台的增删改实时写入服务器数据库。

> 本地数据库和线上数据库是**两份独立的数据**：本地写的内容不会自动同步到线上，
> 反之亦然。想在线上发布内容，登录线上管理后台去写。

### 关闭 VS Code 会怎样

- 关掉 VS Code / 终端后，`uvicorn`（后端）和 `vite`（前端）进程随之结束，**网站服务会停止**——此时 `http://localhost:5173` 就访问不到了。
- 但**代码和数据库文件不会消失**：`chenji_hub.db` 原封不动地躺在磁盘上，下次启动后端 + 前端，之前写的文章、计划、登录过的用户都还在。

### 备份与恢复

提供两个脚本，把数据库复制到 `backups/` 目录（该目录已加入 `.gitignore`，不会上传 GitHub）：

```bash
# 备份：复制 backend/chenji_hub.db 到 backups/（时间戳命名）
python scripts/backup_db.py

# 只保留最近 30 份备份，自动清理更旧的
python scripts/backup_db.py --keep 30

# 查看现有备份
python scripts/restore_db.py --list

# 用最新备份恢复（会先确认，恢复前自动给当前库留底）
python scripts/restore_db.py

# 用指定备份恢复，跳过确认
python scripts/restore_db.py --backup chenji_hub_20260809_203000.db --yes
```

> 建议定期备份：数据只有这一份，误删 / 误改没有撤销。手动跑或者加个计划任务（如每天定时执行 `backup_db.py`）都行。

> **线上数据库备份**：线上用的是 Render PostgreSQL，Render 控制台（数据库面板 → Backups）自带自动备份，建议开启。需要本地留存时，登录 Render 后用 `pg_dump` 导出即可。本地的 `backup_db.py` 只针对本地 SQLite 库，不直接操作线上数据库。

---

## 环境变量说明

`.env.example` 中的每个变量含义如下：

| 变量 | 含义 | 示例值 | 必填 |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID（开发者设置里创建） | `your_github_client_id` | ✅ 生产必填 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret，**不要泄露** | `your_github_client_secret` | ✅ 生产必填 |
| `GITHUB_OAUTH_CALLBACK_URL` | OAuth 回调地址，必须与 GitHub App 里填的回调一致 | `http://localhost:8000/api/auth/github/callback` | ✅ |
| `ADMIN_GITHUB_LOGIN` | 站长 GitHub 用户名，只有它能管理内容（`role=admin`，其他人 `role=reader`） | `chenji0421` | ✅ |
| `AUTH_SECRET` | JWT 签名密钥，部署时务必改成随机长字符串（至少 32 字节） | `change_me_to_a_long_random_string_at_least_32_chars` | ✅ 生产必填 |
| `AUTH_EXPIRE_MINUTES` | 登录 token 过期时间（分钟），默认 7 天 | `10080` | 可选 |
| `FRONTEND_URL` | 前端地址，用于 OAuth 回调跳转和 CORS 白名单 | `http://localhost:5173` | 可选 |
| `DATABASE_URL` | 数据库连接串，第一版用 SQLite | `sqlite:///./chenji_hub.db` | 可选 |

---

## 数据库：SQLite 起步，可升级 PostgreSQL

- **第一版用 SQLite**：不需要额外数据库服务，后端启动时自动建表，数据存到 `chenji_hub.db` 文件。
- **升级 PostgreSQL**：后端用的是 SQLAlchemy，ORM 层与数据库无关。升级时：
  1. 安装驱动：`pip install psycopg2-binary`
  2. 把 `DATABASE_URL` 改成 PostgreSQL 连接串，例如 `postgresql://user:pass@localhost:5432/chenji_hub`
  3. 重启后端即可（表结构由 `create_all` 自动创建；数据量上来后建议引入 Alembic 做迁移）

---

## 权限模型

| 操作 | 访客 | 管理员（`ADMIN_GITHUB_LOGIN`） |
|---|---|---|
| 查看文章 / 计划 | ✅（文章仅已发布） | ✅（含草稿） |
| 新增 / 编辑 / 删除文章、计划 | ❌ | ✅ |

判断依据是 GitHub 用户名，可在 `.env` 的 `ADMIN_GITHUB_LOGIN` 修改。

## API 一览

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/health` | 健康检查 | 公开 |
| GET | `/api/auth/github/start` | 获取 GitHub 授权地址 | 公开 |
| GET | `/api/auth/github/callback` | GitHub 回调，签发 JWT | 公开 |
| GET | `/api/auth/me` | 当前登录用户（含 role） | 登录 |
| POST | `/api/auth/logout` | 登出，吊销当前 token | 登录 |
| GET | `/api/articles` | 文章列表（管理员带 token 可见全部含草稿，访客仅已发布） | 公开 |
| GET | `/api/articles/{id}` | 文章详情（草稿仅管理员可见） | 公开 |
| POST | `/api/admin/articles` | 新增文章 | 管理员 |
| PUT | `/api/admin/articles/{id}` | 编辑文章 | 管理员 |
| DELETE | `/api/admin/articles/{id}` | 删除文章 | 管理员 |
| GET | `/api/plans` | 计划列表（按日期升序） | 公开 |
| GET | `/api/plans/{date}` | 某天计划详情（date 格式 YYYY-MM-DD） | 公开 |
| POST | `/api/admin/plans` | 新增计划（同一天已有计划返回 409） | 管理员 |
| PUT | `/api/admin/plans/{date}` | 编辑某天计划（可挪日期，目标被占返回 409） | 管理员 |
| DELETE | `/api/admin/plans/{date}` | 删除某天计划 | 管理员 |

---

## 部署说明：为什么不能直接放 GitHub Pages

**这个项目不能直接部署到 GitHub Pages。**

GitHub Pages 只托管**静态文件**，而这个全栈项目需要一个常驻的**后端进程**（FastAPI）+ 一个**数据库**（SQLite / PostgreSQL）才能工作——文章和计划都存在数据库里，GitHub Pages 跑不了 Python 后端。

要上线全栈版，需要一台能运行后端的服务器，常见方案：

1. **VPS / 云主机**（如阿里云、腾讯云、云服务器）：后端用 `uvicorn` 常驻 + `systemd`/`nginx` 反向代理，前端 `npm run build` 出的 `dist/` 交给 nginx 托管，`/api` 反代到后端
2. **平台托管**（如 Render、Railway、Fly.io）：直接部署 FastAPI 进程 + 静态托管前端，配好环境变量即可
3. **容器化**：写 `Dockerfile` 把前后端一起打包，一条命令上线

> 如果只想用纯静态的 GitHub Pages 站，那是另一套代码（旧版 `chenji0421.github.io` 纯前端站），不走这个项目。

---

## 部署到 Vercel + Render（推荐）

上一节提到**平台托管**，这里展开成具体方案：**前端放 Vercel（免费、全球 CDN），后端放 Render（免费、跑 FastAPI 进程），数据库用 Render 的 PostgreSQL**。

```
┌──────────────────┐      HTTPS       ┌─────────────────────────┐
│  前端 React + Vite │ ───────────────▶ │  后端 FastAPI（Render）  │
│  Vercel          │   /api/...       │  /api/auth/...          │
└──────────────────┘                  └────────────┬────────────┘
                                                   │ DATABASE_URL
                                          ┌────────▼────────┐
                                          │  PostgreSQL      │
                                          │  Render 数据库    │
                                          └─────────────────┘
```

项目已带好部署配置文件：`render.yaml`（后端 Web 服务 + PostgreSQL 数据库）和 `frontend/vercel.json`（指定前端目录与构建命令）。

### 第 1 步：创建线上版 GitHub OAuth App

在 GitHub → Settings → Developer settings → OAuth Apps 新建（或编辑现有）：

- **Homepage URL**：`https://<你的前端域名>.vercel.app`
- **Authorization callback URL**：`https://<你的后端域名>.onrender.com/api/auth/github/callback`
- 记下 **Client ID** 和 **Client Secret**

> 域名要等下面部署完才知道，可以先占位，第 5 步再回填。

### 第 2 步：部署后端到 Render

**方式 A：Blueprint（推荐，一条命令）**

1. Render 控制台 → **New → Blueprint**
2. 选择本仓库 → Render 自动读取 `render.yaml`，一次创建后端服务 + PostgreSQL 数据库
3. 部署完成后在面板填密钥：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`AUTH_SECRET`（这三项在 `render.yaml` 里是 `sync: false`）

**方式 B：手动**

1. **New → Web Service** → 选仓库，`Root Directory` 填 `backend`
2. Build Command：`pip install -r requirements.txt`
3. Start Command：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. 再 **New → PostgreSQL** 建一个免费数据库，把 `Internal Database URL` 填进后端的 `DATABASE_URL`

### 第 3 步：配置后端环境变量

在后端服务的环境变量里配置（`render.yaml` 里 `value` 是占位符，实际以面板为准）：

| 变量 | 线上值 |
|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | 第 1 步 GitHub OAuth App 的密钥 |
| `GITHUB_OAUTH_CALLBACK_URL` | `https://<后端域名>.onrender.com/api/auth/github/callback` |
| `ADMIN_GITHUB_LOGIN` | `chenji0421` |
| `AUTH_SECRET` | 随机长字符串（`openssl rand -hex 32` 生成） |
| `FRONTEND_URL` | `https://<前端域名>.vercel.app` |
| `DATABASE_URL` | Render PostgreSQL 连接串（Blueprint 方式自动注入） |

> `psycopg2-binary` 已加进 `requirements.txt`，PostgreSQL 驱动开箱即用；`database.py` 已按连接串前缀自动切换 SQLite / PostgreSQL 的连接参数。后端 CORS 白名单会自动并入 `FRONTEND_URL`，线上前端可直接跨域。

### 第 4 步：部署前端到 Vercel

1. Vercel → **New Project** → 导入本仓库
2. Framework Preset 选 **Vite**（`frontend/vercel.json` 已指定 `rootDirectory` 和构建命令）
3. 添加环境变量 **`VITE_API_URL=https://<后端域名>.onrender.com`**
4. **Deploy**

> `VITE_API_URL` 会在**构建时**内联进打包产物（见 `frontend/src/api.js`），所以一定要在 Vercel 面板里填，不能只写本地 `.env`。
> 前端用的是 hash 路由（`#/`），Vercel 不需要额外 rewrites。

### 第 5 步：回填真实域名

部署完成后把实际域名回填：

- GitHub OAuth App 的 **Homepage / Callback URL**
- Render 后端的 **`FRONTEND_URL`** 和 **`GITHUB_OAUTH_CALLBACK_URL`**（`render.yaml` 里是占位符）
- 改完触发重新部署，让改动生效

### 验证上线

- 打开 `https://<前端域名>.vercel.app` → 首页显示「后端连接正常」
- 点「管理 · 登录」→ GitHub 授权 → 跳回 → 进 `/#/admin` 能写文章 / 计划
- `https://<后端域名>.onrender.com/api/health` 返回 `{"status":"ok",...}`

---

## 安全提醒

- **不要把密钥提交到 GitHub**：`.gitignore` 已忽略 `.env`、`.venv`、`node_modules`、`*.db`、`dist`、`backups/`，只有 `.env.example` 模板会被提交
- `.env` 里的 `GITHUB_CLIENT_SECRET` 和 `AUTH_SECRET` 一旦泄露，要立刻去 GitHub 开发者设置里**吊销并重新生成**
- 部署时一定要把 `AUTH_SECRET` 改成随机长字符串（可用 `openssl rand -hex 32` 生成）

---

## 后续计划

- **Markdown 编辑器增强**：支持更多语法（表格、图片上传、代码高亮）
- **工具箱后台管理**：管理员可自定义工具链接（新增 ToolboxLink 模型，保存到数据库）
- **游戏模块**：接入自制的 HTML 小游戏（iframe 容器已预留）
- **计划日历视图增强**：更丰富的日历交互与统计
- **Alembic 迁移**：表结构变更时做可追溯迁移
- **分页**：文章 / 计划数量增多时分页展示
- **搜索**：文章标题 / 标签 / 正文关键字搜索
- **CI 扩展**：在 CI 里跑后端单元测试（目前只做 compileall + import 检查）

## 体验特性

- 左侧侧边栏支持**展开 / 收起**（工作台模式）
- 支持**浅色 / 深色模式**切换（跟随系统偏好，也可手动选择）
- 后台为面板化布局：总览 / 写文章 / 内容库 / 计划管理 / 运维状态
