# Chenji Learning Hub Fullstack

这是 **Chenji Learning Hub 的全栈版本**——一个可以用 GitHub 登录的个人博客 / 学习工作台。

- **访客**：无需登录即可查看文章、公开计划（年表 / 月表 / 日计划）
- **站长**：通过 **GitHub OAuth** 登录后，可以在网站上**直接写文章、修改计划**，不用再改代码
- 第一版使用 **SQLite**，数据就存在本地文件里；后续可以平滑升级到 PostgreSQL

> 项目只有真实内容：数据库初始为空，不生成假文章、假计划、假浏览量。

---

## 功能一览

| 角色 | 能做什么 |
|---|---|
| **访客** | 查看文章（仅已发布）、查看公开计划（年表 / 月表 / 日计划） |
| **站长**（GitHub 用户名 = `ADMIN_GITHUB_LOGIN`） | 登录后：新增 / 编辑 / 删除文章（可存草稿 / 发布）、新增 / 修改 / 删除每天的计划 |

权限**由后端判断**：写接口全部校验 JWT + 管理员身份，前端不做任何密码判断。

## 技术栈

| 层 | 技术 |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI |
| Database | SQLite（第一版，后续可换 PostgreSQL） |
| Auth | GitHub OAuth + JWT |

## 目录结构

```
chenji-learning-hub-fullstack/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # 应用入口
│   │   ├── config.py         # 配置（读 .env）
│   │   ├── database.py       # SQLite 连接
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
│   │   ├── App.jsx           # 极简 hash 路由 + 登录态
│   │   ├── api.js            # 请求封装
│   │   ├── styles.css
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Articles.jsx
│   │       ├── ArticleDetail.jsx
│   │       ├── Plans.jsx
│   │       ├── Login.jsx
│   │       └── Admin.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
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

## 安全提醒

- **不要把密钥提交到 GitHub**：`.gitignore` 已忽略 `.env`、`.venv`、`node_modules`、`*.db`、`dist`，只有 `.env.example` 模板会被提交
- `.env` 里的 `GITHUB_CLIENT_SECRET` 和 `AUTH_SECRET` 一旦泄露，要立刻去 GitHub 开发者设置里**吊销并重新生成**
- 部署时一定要把 `AUTH_SECRET` 改成随机长字符串（可用 `openssl rand -hex 32` 生成）

---

## 说明与下一步

- **不造假**：没有浏览量、阅读时间等字段，只有真实内容
- **SQLite**：第一版不需要额外数据库服务，表在启动时自动创建
- 后续可以考虑：Alembic 迁移、内容 Markdown 渲染增强、图片上传、分页、部署脚本（前端打包后由 FastAPI 托管）
