import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import Home from "./pages/Home.jsx";
import Articles from "./pages/Articles.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import Notes from "./pages/Notes.jsx";
import Plans from "./pages/Plans.jsx";
import Music from "./pages/Music.jsx";
import Toolbox from "./pages/Toolbox.jsx";
import Game from "./pages/Game.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import MiniPlayer from "./components/MiniPlayer.jsx";

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
    // #/plans 月视图 · #/plans/list 列表视图 · #/plans/today 今日计划
    // 深链：#/plans/month/YYYY-MM · #/plans/day/YYYY-MM-DD
    page = <Plans user={user} hashPath={route} />;
  } else if (route === "music") {
    page = <Music />;
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
    if (key === "plans") return route === "plans" || route.startsWith("plans/");
    if (key === "music") return route === "music";
    if (key === "toolbox") return route === "toolbox";
    if (key === "game") return route === "game";
    if (key === "account") return route === "account";
    if (key === "admin") return route === "admin";
    if (key === "login") return route === "login";
    return false;
  };

  // 主导航：首页 / 文章 / 计划 / 音乐 / 工具箱 / 游戏
  // 登录后追加 账号 / 管理；未登录显示 登录
  const publicItems = [
    { key: "", icon: "🏠", label: "首页" },
    { key: "articles", icon: "📝", label: "文章" },
    { key: "plans", icon: "🗓️", label: "计划" },
    { key: "music", icon: "🎵", label: "音乐" },
    { key: "toolbox", icon: "🧰", label: "工具箱" },
    { key: "game", icon: "🎮", label: "游戏" },
  ];
  const userItems = [{ key: "account", icon: "👤", label: "账号" }];
  const authItems = user
    ? [
        ...userItems,
        ...(user.is_admin ? [{ key: "admin", icon: "⚙️", label: "管理" }] : []),
      ]
    : [{ key: "login", icon: "🔑", label: "登录" }];
  const navItems = [...publicItems, ...authItems];

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-head">
          <a href="#/" className="logo" title="沉积 Learning Hub">
            <span className="logo-mark">沉</span>
            <span className="logo-text">
              <span className="logo-title">沉积</span>
              <span className="logo-sub">chenji0421</span>
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
                  width="34"
                  height="34"
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
                    <span className="sidebar-user-role">读者</span>
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
                <span className="avatar avatar-placeholder" aria-hidden="true">
                  👤
                </span>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">未登录</span>
                  <span className="sidebar-user-role">点击账号页登录</span>
                </div>
                <a href="#/account" className="nav-logout" title="去账号页">
                  登录
                </a>
              </>
            )}
          </div>

          <MiniPlayer />

          <div className="sidebar-tools">
            <div className="site-footer">FastAPI + React · chenji0421</div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        {/* 顶部操作区：主题切换 + 在线工作台 + 当前用户 */}
        <div className="topbar">
          <div className="topbar-brand">
            <a href="#/" className="topbar-logo">
              沉积 Learning Hub
            </a>
          </div>
          <div className="topbar-right">
            {user && (
              <a className="topbar-user" href="#/account" title={user.username}>
                <img
                  src={user.avatar_url}
                  alt=""
                  width="24"
                  height="24"
                  className="avatar"
                />
                <span className="topbar-username">
                  {user.username}
                  {user.is_admin ? " · 管理员" : ""}
                </span>
              </a>
            )}
            <a className="btn btn-sm topbar-online" href="#/admin" title="进入管理后台">
              <span className="topbar-online-dot" />
              在线工作台
            </a>
            <button
              type="button"
              className="icon-btn topbar-theme"
              onClick={toggleTheme}
              title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        <div className="page-content">{page}</div>
      </main>
    </div>
  );
}
