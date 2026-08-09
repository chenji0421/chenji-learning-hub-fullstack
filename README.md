# Chenji Learning Hub Fullstack

这是我的全栈个人学习工作台项目。

目标是实现一个支持 GitHub 登录的个人网站：

- 访客可以查看文章和公开计划
- 站长可以使用 GitHub 登录
- 只有 GitHub 用户名为 `chenji0421` 的用户可以进入管理后台
- 管理员可以新增、编辑、删除文章
- 管理员可以新增、编辑、删除计划

## 技术栈

第一版计划使用：

- Frontend：React + Vite
- Backend：FastAPI
- Database：SQLite
- Auth：GitHub OAuth
- Language：Python / JavaScript

## 项目状态

当前项目刚刚创建，正在搭建最小可运行版本。

第一阶段目标：

- 创建前端项目骨架
- 创建后端项目骨架
- 后端提供 `/api/health` 测试接口
- 前端可以访问后端接口
- 暂时不实现真实登录
- 暂时不生成假文章和假计划

## 项目结构规划

```text
chenji-learning-hub-fullstack
├── frontend
│   ├── package.json
│   ├── index.html
│   └── src
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── styles.css
│       └── pages
│           ├── Home.jsx
│           ├── Articles.jsx
│           ├── Plans.jsx
│           ├── Login.jsx
│           └── Admin.jsx
│
├── backend
│   ├── requirements.txt
│   └── app
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── auth.py
│       └── routers
│           ├── health.py
│           ├── auth.py
│           ├── articles.py
│           └── plans.py
│
├── .env.example
├── .gitignore
└── README.md
