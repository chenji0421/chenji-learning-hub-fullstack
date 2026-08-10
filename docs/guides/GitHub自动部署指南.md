# GitHub 自动部署指南

Chenji Learning Hub 通过 **GitHub Actions** 实现「push 到 main 自动部署到服务器」。

## 1. 工作流文件

仓库中有两个工作流：

| 文件 | 作用 |
|---|---|
| `.github/workflows/ci.yml` | CI：push / PR 时检查后端 `compileall` + 前端 `npm run build` |
| `.github/workflows/deploy.yml` | CD：push 到 main 时，SSH 到服务器 `git pull` + 执行部署脚本 |

## 2. 工作原理

```
开发者在本地 commit + push 到 main
  → GitHub Actions 触发 deploy.yml
  → 校验 secrets（DEPLOY_USER / DEPLOY_SSH_KEY）
  → 配置 SSH 密钥（端口固定 22，主机固定 47.242.176.227）
  → 测试 SSH 连接（nc + ssh 密钥认证）
  → SSH 到服务器：git pull --ff-only
  → 执行 scripts/deploy-production.sh（Docker 重建）
```

## 3. 需要配置的 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|---|---|
| `DEPLOY_USER` | 服务器上能免密部署的用户名 |
| `DEPLOY_PATH` | 服务器上的项目目录，如 `/opt/chenji-learning-hub` |
| `DEPLOY_SSH_KEY` | 部署用的 SSH **私钥**（配好公钥到服务器的 `~/.ssh/authorized_keys`） |

> 注意：主机 `47.242.176.227` 和端口 `22` 已**写死**在 workflow 里，不需要配置 `DEPLOY_HOST` / `DEPLOY_PORT`（历史上曾因 secret 配错导致 `Bad port` / DNS 解析失败，已改为写死规避）。

## 4. 服务器端需要手动做的事

GitHub Actions 只负责**把代码拉到服务器并执行脚本**。服务器上必须先手动完成一次：

1. 克隆仓库到部署目录（如 `/opt/chenji-learning-hub`）
2. 创建 `.env`（从 `.env.server.example` 复制并填真实密钥）
3. 配置好 Docker / Nginx
4. 把部署公钥加进 `~/.ssh/authorized_keys`

## 5. 手动触发

- 页面 Actions → 左侧 Deploy → 右侧 **Run workflow** 按钮，可以手动触发一次（用当前 main 分支）。

## 6. 排查指南

### 卡在「Configure SSH」失败

- 大概率是 `DEPLOY_SSH_KEY` 格式不对（需要带首尾 `-----BEGIN/END OPENSSH PRIVATE KEY-----`）。
- 或密钥已过期，去服务器重新 `ssh-copy-id` 生成。

### 卡在「Check SSH connection」失败

- 服务器是否开机、防火墙是否放行 22 端口。
- 部署用户是否被允许 SSH 登录（`/etc/ssh/sshd_config`）。

### Deploy on server 失败

- SSH 已通，但服务器上 `git pull` 冲突或 Docker 构建失败。
- 登录服务器手动执行 `./scripts/deploy-production.sh` 看具体报错。

### 页面显示旧版本

- 先看 Actions 最近一次 run 是否 success。
- 服务器上 `docker compose ps` 看容器是否重建、是否在跑。
- 浏览器可能缓存了旧静态资源，强刷（Ctrl+F5）再试。
