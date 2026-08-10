// 静态数据：沉积学习工作台的工具箱入口。
// 原则：只放沉积自己用得上手的真实入口，不堆看不懂的英文官方文档。
// - 每个卡片都有「是什么 / 什么时候用 / 点进去能做什么」三段说明
// - 官方文档统一放在最后一组「进阶参考」，不作为主入口
// - 想自己加工具：在对应分组的 cards 数组里照样子加一条即可

export const TOOLBOX_GROUPS = [
  {
    title: "项目入口",
    icon: "🚀",
    desc: "这个网站相关的四个「大门」，平时用得最多。",
    cards: [
      {
        name: "线上网站",
        what: "沉积 Learning Hub 的正式地址，别人访问我的学习工作台就是打开它。",
        when: "想把网站发给别人看、或者自己快速确认线上状态时。",
        action: "打开网站",
        url: "https://chenji.felixfu.xyz",
      },
      {
        name: "GitHub 仓库",
        what: "项目所有代码、提交记录和自动部署配置都存放在这里。",
        when: "想改代码、看某次提交改了什么、确认文件有没有被跟踪时。",
        action: "打开仓库",
        url: "https://github.com/chenji0421/chenji-learning-hub-fullstack",
      },
      {
        name: "管理后台",
        what: "登录 GitHub 后，写文章、改计划、管理内容的工作台。",
        when: "想发新文章、调整学习计划、清理测试内容时。",
        action: "进入后台",
        url: "#/admin",
        internal: true,
      },
      {
        name: "GitHub Actions",
        what: "自动部署的「体检报告」——每次 push 后会自动跑一遍。",
        when: "改完代码 push 了，想确认部署有没有成功时。",
        action: "查看部署",
        url: "https://github.com/chenji0421/chenji-learning-hub-fullstack/actions",
      },
    ],
  },
  {
    title: "AI 与常用网站",
    icon: "🌐",
    desc: "这里放一些我平时最常打开的网站入口，方便从沉积 Learning Hub 直接跳转。",
    cards: [
      {
        name: "🤖 ChatGPT",
        what: "和 AI 对话、查资料、整理思路、辅助学习和写代码。",
        when: "遇到问题时，可以用它解释概念、生成思路、检查代码和整理学习计划。",
        action: "打开 ChatGPT",
        url: "https://chatgpt.com",
      },
      {
        name: "📺 哔哩哔哩 / B站",
        what: "看学习视频、公开课、技术教程，也可以适当放松。",
        when: "查找课程讲解、编程教程、软件使用教程、英语学习视频等。",
        action: "打开 B站",
        url: "https://www.bilibili.com",
      },
    ],
  },
  {
    title: "内容维护",
    icon: "✍️",
    desc: "日常更新网站内容最常见的四件事，都从管理后台进。",
    cards: [
      {
        name: "写一篇文章",
        what: "进入后台「写文章」，填标题、摘要、分类、标签和正文。",
        when: "学了新东西想记录成文章时。",
        action: "去写文章",
        url: "#/admin",
        internal: true,
      },
      {
        name: "修改学习计划",
        what: "后台「计划管理」里按日期新增或修改每天的学习安排。",
        when: "想记录今天学了什么、或安排明天的计划时。",
        action: "去改计划",
        url: "#/admin",
        internal: true,
      },
      {
        name: "删除测试内容",
        what: "后台把测试文章或测试计划删掉，让公开页面保持干净。",
        when: "发现首页或计划页出现了测试数据时。",
        action: "去后台清理",
        url: "#/admin",
        internal: true,
      },
      {
        name: "更新首页介绍",
        what: "首页的标题、简介、状态卡文字写在前端代码里，不在后台。",
        when: "想改首页自我介绍、项目状态、快捷入口时。",
        action: "查看改法",
        detail:
          "打开 frontend/src/pages/Home.jsx 修改文字，然后依次执行：git add .、git commit -m \"更新首页文案\"、git push。push 后 GitHub Actions 会自动重新部署，刷新线上网站即可看到。",
      },
    ],
  },
  {
    title: "常用命令",
    icon: "⌨️",
    desc: "本地开发最常用的命令，复制到终端（PowerShell）里执行。",
    commands: [
      {
        title: "启动后端",
        note: "跑起 API，浏览器打开 http://localhost:8000/api/health 可检查",
        lines: [
          "cd backend",
          ".venv\\Scripts\\Activate.ps1",
          "python -m uvicorn app.main:app --reload",
        ],
      },
      {
        title: "启动前端",
        note: "打开开发页面 http://localhost:5173，改代码会自动刷新",
        lines: ["cd frontend", "npm run dev"],
      },
      {
        title: "提交代码",
        note: "push 之后会自动触发 GitHub Actions 部署线上",
        lines: [
          "git status",
          "git add .",
          "git commit -m \"更新说明\"",
          "git push",
        ],
      },
      {
        title: "检查后端是否正常",
        note: "浏览器打开，看到 {\"status\":\"ok\"} 就说明后端正常",
        lines: ["http://localhost:8000/api/health"],
      },
    ],
  },
  {
    title: "故障排查",
    icon: "🔍",
    desc: "网站出问题时的自查清单，从最常见的问题开始。",
    cards: [
      {
        name: "网站打不开",
        what: "线上网站访问不了。",
        when: "地址输对了、网络也正常，但还是打不开时。",
        action: "查看排查步骤",
        detail:
          "按顺序检查：① 服务器是否在运行；② Docker 容器是否正常（docker ps）；③ Nginx 是否启动；④ 域名解析是否指向服务器 IP。任一环节断了，就从断掉的那一步开始修。",
      },
      {
        name: "GitHub 登录失败",
        what: "点了「使用 GitHub 登录」后没有成功。",
        when: "点了登录按钮、授权完没有跳回或提示错误时。",
        action: "查看检查点",
        detail:
          "① 检查 GitHub 应用的 OAuth callback 是否填了 https://chenji.felixfu.xyz/api/auth/github/callback；② 检查线上 .env 里的 Client ID 和 Client Secret 是否与 GitHub 应用一致；③ 看后端日志有没有报错。",
      },
      {
        name: "Actions 红叉",
        what: "GitHub Actions 页面显示红色 ❌。",
        when: "push 后想确认部署，看到红叉时。",
        action: "查看处理方式",
        detail:
          "点进红叉对应的 run，展开失败的那一步看日志，日志底部通常写着具体原因（比如服务器 SSH 连不上、依赖装不上）。不要只盯着红叉，要读日志里的错误信息。",
      },
      {
        name: "文章保存失败",
        what: "后台写文章点保存没成功。",
        when: "保存按钮报错、文章没出现在列表里时。",
        action: "查看检查点",
        detail:
          "① 按 F12 打开浏览器控制台，看 Network 里那条请求的报错信息；② 看后端终端或日志有没有异常；③ 确认自己已登录且是管理员（普通账号没有保存权限）。",
      },
      {
        name: "数据丢失风险",
        what: "文章和计划都存在服务器数据库里，不在浏览器。",
        when: "担心数据安全，或想手动备份时。",
        action: "查看备份方式",
        detail:
          "数据存在服务器数据库，不在浏览器 localStorage。建议定期运行备份脚本 scripts/backup_db.py，具体步骤见 docs/guides/数据库备份和恢复.md。",
      },
    ],
  },
  {
    title: "学习资料",
    icon: "📖",
    desc: "新手阶段看得懂的资料入口，每个都配了通俗说明。",
    cards: [
      {
        name: "GitHub 入门",
        what: "学会仓库、提交、Actions 和协作，管理自己的项目。",
        when: "想理解现在整个项目是怎么用 Git 管理的。",
        action: "查看资料",
        url: "https://docs.github.com/zh/get-started",
      },
      {
        name: "HTML / CSS 入门",
        what: "网页的结构和样式是怎么写的。",
        when: "想看懂前端页面为什么长这样。",
        action: "查看资料",
        url: "https://developer.mozilla.org/zh-CN/docs/Learn",
      },
      {
        name: "JavaScript 入门",
        what: "让网页动起来的语言。",
        when: "想理解页面交互、按钮点击后发生了什么。",
        action: "查看资料",
        url: "https://zh.javascript.info/",
      },
      {
        name: "Python 入门",
        what: "后端和脚本的基础语言，本项目后端就是 Python。",
        when: "想理解 API 接口、数据处理脚本是怎么写的。",
        action: "查看资料",
        url: "https://docs.python.org/zh-cn/3/tutorial/",
      },
      {
        name: "React 入门",
        what: "当前前端页面是怎么用组件搭起来的。",
        when: "想改前端界面但不知道从哪下手。",
        action: "查看资料",
        url: "https://zh-hans.react.dev/learn",
      },
      {
        name: "FastAPI 入门",
        what: "当前后端接口是怎么写出来的。",
        when: "想理解 /api 接口是怎么工作的、怎么加新接口。",
        action: "查看资料",
        url: "https://fastapi.tiangolo.com/zh/tutorial/",
      },
    ],
  },
  {
    title: "进阶参考",
    icon: "🧠",
    desc: "需要深入研究时才打开的官方文档，平时不用管。",
    cards: [
      {
        name: "MDN Web Docs",
        what: "Web 标准权威文档。",
        when: "写前端遇到某个标签、属性不会用，需要查具体细节时。",
        action: "打开文档",
        url: "https://developer.mozilla.org/zh-CN/",
      },
      {
        name: "Python 官方文档",
        what: "Python 语言完整参考。",
        when: "想查某个函数、模块的完整用法时。",
        action: "打开文档",
        url: "https://docs.python.org/zh-cn/3/",
      },
      {
        name: "pandas 文档",
        what: "数据分析核心库的文档。",
        when: "做数据分析时查 DataFrame 的具体操作。",
        action: "打开文档",
        url: "https://pandas.pydata.org/docs/",
      },
      {
        name: "FastAPI 完整文档",
        what: "后端框架的完整参考。",
        when: "想深入了解 FastAPI 的高级用法时。",
        action: "打开文档",
        url: "https://fastapi.tiangolo.com/zh/",
      },
      {
        name: "Vite 文档",
        what: "前端构建工具文档。",
        when: "遇到构建、打包相关的问题时查。",
        action: "打开文档",
        url: "https://cn.vitejs.dev/",
      },
    ],
  },
];
