import { useEffect, useState } from "react";
import { api, setToken } from "../api.js";

export default function Login() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // GitHub 回调跳转形如 http://localhost:5173/#/login?token=xxx
    // 问号在 hash 片段里，window.location.search 读不到，所以从完整 URL 正则提取
    const full = window.location.href;
    const match = full.match(/[?&]token=([^&#]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      setToken(token);
      // 清掉地址栏里的 token，再跳转管理页
      window.history.replaceState({}, "", window.location.pathname);
      window.dispatchEvent(new Event("auth:changed"));
      window.location.hash = "#/admin";
      return;
    }
    api
      .loginUrl()
      .then(setUrl)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="login-page">
      <div className="login">
        <span className="login-logo">📚</span>
        <h1>登录 沉积 Learning Hub</h1>
        <p>
          使用 GitHub 账号登录。只有管理员（<code>chenji0421</code>）可以管理内容，
          访客无需登录即可查看文章和计划。
        </p>
        {error && <div className="error-box">{error}</div>}
        {url ? (
          <a className="btn btn-primary" href={url}>
            使用 GitHub 登录
          </a>
        ) : (
          !error && <div className="loading">正在获取登录地址…</div>
        )}
        <ul className="login-feature-list">
          <li>✅ 登录后可进入管理后台写文章</li>
          <li>✅ 可维护每天的计划</li>
          <li>✅ 非管理员仅可浏览，不能修改</li>
        </ul>
      </div>
    </div>
  );
}
