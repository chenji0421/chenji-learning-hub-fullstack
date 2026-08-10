# GitHub 登录配置指南

Chenji Learning Hub 使用 **GitHub OAuth** 作为唯一登录方式。本文介绍如何创建 OAuth App、配置回调地址，以及常见问题排查。

## 1. 创建 GitHub OAuth App

1. 打开 GitHub → 右上角头像 → **Settings** → 左侧 **Developer settings** → **OAuth Apps** → **New OAuth App**。
2. 填写表单：

   | 字段 | 本地开发 | 线上部署 |
   |---|---|---|
   | Application name | `Chenji Learning Hub (dev)` | `Chenji Learning Hub` |
   | Homepage URL | `http://localhost:5173` | `https://chenji.felixfu.xyz` |
   | Authorization callback URL | `http://localhost:8000/api/auth/github/callback` | `https://chenji.felixfu.xyz/api/auth/github/callback` |

3. 创建后记下 **Client ID** 和 **Client Secret**（Secret 只显示一次，漏了就重新生成）。

## 2. 配置环境变量

把 Client ID / Secret 填入项目的 `.env`：

```bash
GITHUB_CLIENT_ID=你的_client_id
GITHUB_CLIENT_SECRET=你的_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:8000/api/auth/github/callback
ADMIN_GITHUB_LOGIN=chenji0421
FRONTEND_URL=http://localhost:5173
AUTH_SECRET=换成随机长字符串
```

> `.env` 已被 `.gitignore` 忽略，**绝不要提交到 GitHub**。参考 `backend/.env` 或 `.env.example` 的字段结构。

## 3. 登录流程

```
访客点击「登录」
  → 后端 GET /api/auth/github/start 返回 GitHub 授权地址
  → 跳转到 GitHub 授权页
  → 用户同意后 GitHub 回跳到 callback?code=xxx
  → 后端用 code 换 access_token，再拉取用户信息
  → 签发 JWT，跳回前端 #/login?token=xxx
  → 前端保存 token，进入管理后台
```

## 4. 管理员判断

只有 GitHub 用户名等于 `ADMIN_GITHUB_LOGIN`（默认 `chenji0421`）的用户是管理员，其他人登录后是读者（`reader`），只能浏览不能修改。

判断在后端完成（`app/auth.py` 的 `role_for`），前端不做任何权限判断。

## 5. 常见问题

### 登录后一直卡在「正在获取登录状态…」

- 检查浏览器控制台是否有 `401`：通常是 `AUTH_SECRET` 改了导致旧 token 失效，重新登录即可。
- 检查前端是否成功拿到 token：地址栏应有 `#/login?token=...`。

### GitHub 报「The redirect_uri MUST match the registered callback URL」

回调地址不匹配。核对三处一致：
1. GitHub OAuth App 的 **Authorization callback URL**
2. 后端 `.env` 的 `GITHUB_OAUTH_CALLBACK_URL`
3. 线上 nginx 是否把 `/api` 正确反代到后端

### 本地能登录，线上不能

通常是线上环境变量没配好，或 nginx 没反代 `/api`。按 [云服务器部署指南](./云服务器部署指南.md) 核对。

### Client Secret 泄露了

立刻去 GitHub OAuth App 设置里 **重新生成 Client Secret**，并同步更新线上 `.env`。
