# Changelog

本项目所有重要变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.2.0] — 2026-08-10 · 高仿架构升级：工作台化 + 内容中心 + 文档体系

### 前端架构升级
- 侧边栏支持**展开 / 收起**（工作台模式，状态存 localStorage），收起后只显示图标
- 新增**浅色 / 深色模式**切换（跟随系统偏好 + 手动选择，`<html data-theme>` + CSS 变量）
- 导航重构：首页 / 文章 / **技术笔记** / 计划 / **工具箱** / **游戏** / **账号** / 管理（管理员）/ 登录（访客）
- 新增页面：
  - **技术笔记**（`Notes`）：与普通文章共用 Article 模型，按分类「技术笔记 / 笔记」区分
  - **工具箱**（`Toolbox`）：真实通用学习 / 开发资源入口（GitHub、MDN、Python、pandas、FastAPI、React、Vite 等）
  - **游戏**（`Game`）：空状态 + 预留 iframe 容器，不放假游戏
  - **账号中心**（`Account`）：显示当前用户、GitHub 用户名、角色（admin / reader）、退出登录

### 首页升级
- Hero 区：标题 + 副标题 + 简介（真实介绍）
- 4 个状态卡：已发布文章数 / 公开计划数 / 技术笔记数 / 后端健康（全部来自真实 API，为 0 显示空状态）
- 最近文章、近期计划、快捷入口、项目说明

### 管理后台面板化
- 后台改为标签页：**总览 / 写文章 / 内容库 / 计划管理 / 运维状态**
- 总览：统计卡 + 快捷操作 + 内容统计
- 内容库：按全部 / 已发布 / 草稿筛选，支持发布 / 转草稿 / 编辑 / 删除
- 运维状态：线上地址、部署方式、GitHub 仓库、后端健康检查（`/api/health`）

### 文档与品牌
- 新增 `docs/` 文档体系：`docs/README.md` + 6 篇指南（GitHub 登录、自动部署、云服务器部署、数据库说明、备份恢复、服务器运维手册）
- 全站品牌统一为 Chenji / chenji0421 / chenji.felixfu.xyz，清理文档残留的旧品牌名
- README 补充目录结构与后续计划
- 新增 `.github/workflows/ci.yml`：push / PR 时检查后端 `compileall` + 前端 `npm run build` + compose 配置
- 站点 favicon（📚）+ `meta description` + `:focus-visible` 焦点环 + 平滑滚动

### 未改动（保持线上稳定）
- 后端接口路径、数据库结构、GitHub OAuth 逻辑零改动
- Docker / Nginx / GitHub Actions 部署体系未动（`deploy.yml` 保持可用）
- 未生成任何假文章、假计划、假浏览量、假点赞、假评论

---

## [0.2.0] — 2026-08-10 · 线上部署修复 + 工作台视觉优化

### 修复
- GitHub Actions：SSH 端口固定为 22，不再读 `DEPLOY_PORT` secret（修复 `Bad port` 报错）
- GitHub Actions：主机写死为公网 IP `47.242.176.227`，不再读 `DEPLOY_HOST` secret（修复 DNS 解析失败）
- 全链路自动部署跑通：Validate secrets → Configure SSH → Check SSH connection → Deploy on server → Complete

### 新增
- 前端工作台视觉优化：左侧固定侧边栏（品牌区 + 图标导航 + 用户徽章）、首页 hero + 真实统计 + 最近文章 / 计划、文章卡片（分类 / 标签 / 摘要 / 更新时间）、更精致的登录卡片与管理后台
- Markdown 渲染增强：标题 / 列表 / 引用 / 代码块 / 加粗 / 斜体 / 行内代码 / 链接
- README 更新线上部署状态（https://chenji.felixfu.xyz）

---

## [0.1.0] — 2026-08-09 · 初始可运行版本 + 部署体系

### 新增
- 全栈项目骨架：React + Vite 前端 / FastAPI 后端 / SQLite 数据库
- GitHub OAuth 登录 + JWT 会话，管理员（`chenji0421`）可进入后台
- 管理后台：文章管理（新建 / 编辑 / 删除 / 发布 / 草稿）、计划管理（年表 / 月表 / 日计划三视图 + 计划月历）
- 数据备份脚本 `scripts/backup_db.py` / `scripts/restore_db.py`
- 部署配置：Docker Compose（服务器）、GitHub Actions（自动部署）、render.yaml / vercel.json（平台托管）
- 前端 UI 优化：左侧 sidebar + 后台工作台布局
