import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import Home from "./pages/Home.jsx";
import Articles from "./pages/Articles.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import Notes from "./pages/Notes.jsx";
import Plans from "./pages/Plans.jsx";
import Toolbox from "./pages/Toolbox.jsx";
import Game from "./pages/Game.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";

const THEME_KEY = "chl_theme";
const COLLAPSE_KEY = "chl_sidebar_collapsed";

// 极简 hash 路由：不引入 react-router，保持依赖最小
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split("?")[0];
}

export default function App() {
  const [route, setRoute] = useState(parseHash());
  const [user, setUser] = useState(null);
  // 主题：优先用本地保存的，其次跟随系统偏好，默认浅色
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  // 侧边栏展开 / 收起：持久化到 localStorage
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1"
  );

  // 主题生效到 <html data-theme>，并记住用户选择
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // 有 token 时拉取用户信息；登录/退出时通过 auth:changed 事件通知刷新
  useEffect(() => {
    const loadUser = () => {
      if (!getToken()) {
        setUser(null);
        return;
      }
      api
        .me()
        .then(setUser)
        .catch((e) => {
          // token 过期/无效时清掉本地 token，否则管理页会卡在「正在获取登录状态…」
          if (e.status === 401) setToken(null);
          setUser(null);
        });
    };
    loadUser();
    const onAuth = () => loadUser();
    window.addEventListener("auth:changed", onAuth);
    return () => window.removeEventListener("auth:changed", onAuth);
  }, []);

  // 登出：调用后端吊销 token，清掉 localStorage，回首页
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // 后端登出是幂等的，网络失败也照常清本地 token
    }
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth:changed"));
    window.location.hash = "#/";
  };

  let page;
  if (route.startsWith("articles/")) {
    page = <ArticleDetail id={route.split("/")[1]} />;
  } else if (route === "articles") {
    page = <Articles />;
  } else if (route === "notes") {
    page = <Notes />;
  } else if (route === "plans" || route.startsWith("plans/")) {
    // #/plans 年表 · #/plans/YYYY 年份 · #/plans/YYYY-MM 月表 · #/plans/YYYY-MM-DD 日计划
    page = <Plans user={user} hashPath={route} />;
  } else if (route === "toolbox") {
    page = <Toolbox />;
  } else if (route === "game") {
    page = <Game />;
  } else if (route === "account") {
    page = <Account user={user} onLogout={handleLogout} />;
  } else if (route === "login") {
    page = <Login />;
  } else if (route === "admin") {
    page = <Admin user={user} />;
  } else {
    page = <Home user={user} />;
  }

  // 左侧导航高亮判断
  const isActive = (key) => {
    if (key === "") return route === "" || route === "home";
    if (key === "articles") return route === "articles" || route.startsWith("articles/");
    if (key === "notes") return route === "notes";
    if (key === "plans") return route === "plans" || route.startsWith("plans/");
    if (key === "toolbox") return route === "toolbox";
    if (key === "game") return route === "game";
    if (key === "account") return route === "account";
    if (key === "admin") return route === "admin";
    if (key === "login") return route === "login";
    return false;
  };

  // 导航：访客可浏览的公共页面 + 登录 / 账号 / 管理
  const publicItems = [
    { key: "", icon: "🏠", label: "首页" },
    { key: "articles", icon: "📝", label: "文章" },
    { key: "notes", icon: "🗂️", label: "技术笔记" },
    { key: "plans", icon: "🗓️", label: "计划" },
    { key: "toolbox", icon: "🧰", label: "工具箱" },
    { key: "game", icon: "🎮", label: "游戏" },
  ];
  const userItems = [
    { key: "account", icon: "👤", label: "账号" },
  ];
  const authItems = user
    ? [
        ...userItems,
        ...(user.is_admin
          ? [{ key: "admin", icon: "⚙️", label: "管理" }]
          : []),
      ]
    : [{ key: "login", icon: "🔑", label: "登录" }];
  const navItems = [...publicItems, ...authItems];

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-head">
          <a href="#/" className="logo" title="Chenji Learning Hub">
            <span className="logo-mark">📚</span>
            <span className="logo-text">
              <span className="logo-title">Chenji Learning Hub</span>
              <span className="logo-sub">记录学习 · 项目 · 计划</span>
            </span>
          </a>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">导航</div>
          {navItems.map((item) => (
            <a
              key={item.key}
              href={`#/${item.key}`}
              className={isActive(item.key) ? "active" : ""}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            {user ? (
              <>
                <img
                  src={user.avatar_url}
                  alt=""
                  width="32"
                  height="32"
                  className="avatar"
                  title={user.username}
                />
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name" title={user.username}>
                    {user.username}
                  </span>
                  {user.is_admin ? (
                    <span className="role-badge">管理员</span>
                  ) : (
                    <span className="sidebar-user-role">访客</span>
                  )}
                </div>
                <button
                  type="button"
                  className="nav-logout"
                  onClick={handleLogout}
                  title="退出登录"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <span className="avatar" style={{ width: 32, height: 32 }} />
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">访客</span>
                  <span className="sidebar-user-role">未登录</span>
                </div>
                <a href="#/login" className="nav-logout" title="去登录">
                  去登录
                </a>
              </>
            )}
          </div>
          <div className="sidebar-tools">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
              <span className="theme-label">
                {theme === "dark" ? "浅色模式" : "深色模式"}
              </span>
            </button>
            <div className="site-footer">
              FastAPI + React · chenji0421
            </div>
          </div>
        </div>
      </aside>
      <main className="main-area">{page}</main>
    </div>
  );
}
