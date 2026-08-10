# Changelog

本项目所有重要变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased] — 第一阶段：品牌替换 + 文档完善 + UI 小幅打磨

### 变更
- 品牌统一：移除文档中残留的旧品牌名（`Felix Fu's server`），站点统一使用 Chenji / chenji0421 / chenji.felixfu.xyz
- 新增 `CHANGELOG.md`，记录项目变更历史
- README 补充更新日志入口

### UI 小幅优化
- 站点添加 favicon（emoji）与 `meta description`
- 补充键盘焦点可见样式（`:focus-visible`），键盘 / 无障碍浏览体验更好
- 页面滚动平滑化（`scroll-behavior: smooth`）

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
