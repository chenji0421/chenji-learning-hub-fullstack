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
        .catch(() => setUser(null));
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
    page = <Home />;
  }

  return (
    <div className="app">
      <header className="site-header">
        <a href="#/" className="logo">
          📚 Chenji Learning Hub
        </a>
        <nav className="site-nav">
          <a href="#/">首页</a>
          <a href="#/articles">文章</a>
          <a href="#/plans">计划</a>
          {user ? (
            <>
              <a href="#/admin">管理</a>
              <span className="nav-user" title={user.username}>
                <img src={user.avatar_url} alt="" width="22" height="22" className="avatar" />
                {user.username}
              </span>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <a href="#/login">登录</a>
          )}
        </nav>
      </header>
      <main className="page">{page}</main>
      <footer className="site-footer">Chenji Learning Hub · FastAPI + React + SQLite</footer>
    </div>
  );
}
