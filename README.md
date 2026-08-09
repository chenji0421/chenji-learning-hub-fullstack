# Chenji Learning Hub Fullstack

一个可以用 GitHub 登录的个人博客 / 学习工作台。

- **访客**：查看文章、查看公开计划
- **管理员**（GitHub 用户名 `chenji0421`）：登录后可以在网站里新增、编辑、删除文章和计划

> 第一版为项目骨架 + 基础页面。不生成假文章、假计划、假浏览量——数据库里只有真实创建的内容。

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

## 快速开始

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

编辑 `.env`，填入真实的 Client ID / Secret，并把 `AUTH_SECRET` 改成随机长字符串。

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

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

开发时 Vite 会把 `/api` 代理到 `http://localhost:8000`，无需额外配置。

## 权限模型

| 操作 | 访客 | 管理员（`chenji0421`） |
|---|---|---|
| 查看文章 / 计划 | ✅ | ✅ |
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

## 说明与下一步

- **不造假**：没有浏览量、阅读时间等字段，只有真实内容
- **SQLite**：第一版不需要额外数据库服务，表在启动时自动创建
- 后续可以考虑：Alembic 迁移、内容 Markdown 渲染增强、图片上传、分页、部署脚本（前端打包后由 FastAPI 托管 / 静态托管）
