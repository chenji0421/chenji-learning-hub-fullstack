import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import Home from "./pages/Home.jsx";
import Articles from "./pages/Articles.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import Plans from "./pages/Plans.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";

// 极简 hash 路由：不引入 react-router，保持依赖最小
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split("?")[0];
}

export default function App() {
  const [route, setRoute] = useState(parseHash());
  const [user, setUser] = useState(null);

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
  } else if (route === "plans" || route.startsWith("plans/")) {
    // #/plans 年表 · #/plans/YYYY 年份 · #/plans/YYYY-MM 月表 · #/plans/YYYY-MM-DD 日计划
    page = <Plans user={user} hashPath={route} />;
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
    if (key === "admin") return route === "admin";
    if (key === "login") return route === "login";
    return false;
  };

  const navItems = [
    { key: "", icon: "🏠", label: "首页" },
    { key: "articles", icon: "📝", label: "文章" },
    { key: "plans", icon: "🗓️", label: "计划" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#/" className="logo">
          <span className="logo-mark">📚</span>
          <span className="logo-text">
            <span className="logo-title">Chenji Learning Hub</span>
            <span className="logo-sub">记录学习 · 项目 · 计划</span>
          </span>
        </a>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">导航</div>
          {navItems.map((item) => (
            <a
              key={item.key}
              href={`#/${item.key}`}
              className={isActive(item.key) ? "active" : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
          {user ? (
            <a href="#/admin" className={isActive("admin") ? "active" : ""}>
              <span className="nav-icon">⚙️</span>
              管理
            </a>
          ) : (
            <a href="#/login" className={isActive("login") ? "active" : ""}>
              <span className="nav-icon">🔑</span>
              登录
            </a>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            {user ? (
              <>
                <img src={user.avatar_url} alt="" width="32" height="32" className="avatar" />
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
                <button type="button" className="nav-logout" onClick={handleLogout}>
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
                <a href="#/login" className="nav-logout">
                  去登录
                </a>
              </>
            )}
          </div>
          <div className="site-footer">FastAPI + React + SQLite</div>
        </div>
      </aside>
      <main className="main-area">{page}</main>
    </div>
  );
}
