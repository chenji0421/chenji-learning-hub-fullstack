// 静态数据：工具箱的真实通用资源入口。
// 只放真实可用的学习 / 开发站点，不含假数据。
// 后续如果要让管理员在后台自定义工具链接，可以加 ToolboxLink 模型改成读数据库。

export const TOOLBOX_GROUPS = [
  {
    title: "代码与开源",
    icon: "💻",
    items: [
      {
        name: "GitHub",
        desc: "代码托管与开源社区，学习项目都放这里",
        url: "https://github.com",
      },
      {
        name: "MDN Web Docs",
        desc: "Web 标准、HTML/CSS/JS 权威文档",
        url: "https://developer.mozilla.org/zh-CN/",
      },
    ],
  },
  {
    title: "Python 学习",
    icon: "🐍",
    items: [
      {
        name: "Python 官方文档",
        desc: "Python 语言参考与教程（中文）",
        url: "https://docs.python.org/zh-cn/3/",
      },
      {
        name: "pandas 文档",
        desc: "数据分析核心库的文档",
        url: "https://pandas.pydata.org/docs/",
      },
    ],
  },
  {
    title: "框架与工具",
    icon: "🧩",
    items: [
      {
        name: "FastAPI 文档",
        desc: "Python Web 框架（本项目后端）",
        url: "https://fastapi.tiangolo.com/zh/",
      },
      {
        name: "React 文档",
        desc: "前端框架（本项目前端）",
        url: "https://zh-hans.react.dev/",
      },
      {
        name: "Vite 文档",
        desc: "前端构建工具（本项目前端）",
        url: "https://cn.vitejs.dev/",
      },
    ],
  },
  {
    title: "在线小工具",
    icon: "🛠️",
    items: [
      {
        name: "regex101",
        desc: "正则表达式在线调试",
        url: "https://regex101.com/",
      },
      {
        name: "JSON 中文网",
        desc: "JSON 格式化 / 校验",
        url: "https://www.json.cn/",
      },
    ],
  },
];
