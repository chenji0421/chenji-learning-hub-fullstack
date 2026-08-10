import { useEffect, useState } from "react";
import { api } from "../api.js";

// 首页的技术笔记计数与 Notes 页保持同一分类约定
const NOTE_CATEGORIES = ["技术笔记", "笔记"];

// 真实项目迭代记录（与 CHANGELOG.md 一致，都是真实发生过的版本）
const UPDATES = [
  {
    version: "v1.2.0",
    date: "2026-08",
    text: "工具箱重构为「学习与维护工具箱」，新增 CI 检查与部署指南",
  },
  {
    version: "v1.1.0",
    date: "2026-08",
    text: "UI 工作台化：侧边栏导航、深浅色模式、后台面板化、六篇部署文档",
  },
  {
    version: "v1.0.0",
    date: "2026-08",
    text: "线上部署跑通：GitHub 登录、管理员后台、文章与计划系统上线",
  },
];

export default function Home({ user }) {
  const [articles, setArticles] = useState(null);
  const [plans, setPlans] = useState(null);
  const [health, setHealth] = useState(null);
  // 时钟卡片：每秒刷新
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    Promise.all([api.listArticles(), api.listPlans(), api.health().catch(() => null)])
      .then(([a, p, h]) => {
        setArticles(a);
        setPlans(p);
        setHealth(h);
      })
      .catch(() => {
        // 后端不可用时置空，页面仍能渲染空状态而不是崩掉
        setArticles([]);
        setPlans([]);
        setHealth(null);
      });
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = articles === null || plans === null;
  const published = (articles || []).filter((a) => a.status === "published");
  const notes = published.filter((a) => NOTE_CATEGORIES.includes(a.category));
  const recentArticles = published.slice(0, 3);

  const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="home">
      {/* 深色科技感 Hero：网格背景 + 渐变光晕 + 终端卡片 */}
      <section className="hero-tech">
        <div className="hero-tech-grid" aria-hidden="true" />
        <div className="hero-tech-glow" aria-hidden="true" />
        <div className="hero-tech-body">
          <span className="hero-tech-badge">
            <span className="pulse-dot" />
            当前专注 Web 前端 & Python
          </span>
          <h1>
            你好，我是
            <br />
            沉积
          </h1>
          <p className="hero-tech-sub">一名正在长跑中的长期主义者</p>
          <p className="hero-tech-desc">
            普通大学生，正在努力把「想做的事」变成「会做的事」。从一行代码开始，
            一路把课程笔记、AI 工具、小游戏和运维后台慢慢接到这个小站里。
          </p>

          <div className="hero-terminal">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> boot{" "}
              <span className="terminal-val">personal site online</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> stack{" "}
              <span className="terminal-val">React + FastAPI + Docker</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> auth{" "}
              <span className="terminal-val">GitHub OAuth enabled</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> mode{" "}
              <span className="terminal-val">learning mode</span>
            </div>
          </div>

          <div className="hero-tech-actions">
            <a className="btn btn-primary" href="#/articles">
              📝 查看文章
            </a>
            <a className="btn btn-ghost" href="#/plans">
              🗓️ 查看计划
            </a>
            {user ? (
              <a className="btn btn-ghost" href="#/admin">
                ⚙️ 管理后台
              </a>
            ) : (
              <a className="btn btn-ghost" href="#/login">
                🔑 登录
              </a>
            )}
          </div>
          <p className="hero-whoami">~/whoami</p>
        </div>
      </section>

      {/* 时钟卡片 + 站点状态卡 */}
      <div className="home-status-grid">
        <div className="clock-card">
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
          <div className="clock-tz">Asia/Shanghai · GMT+8</div>
        </div>

        <div className="site-status-card">
          <h2>📡 站点状态</h2>
          <ul className="site-status-list">
            <li>
              <span className="status-label">上线时间</span>
              <span>2026-08</span>
            </li>
            <li>
              <span className="status-label">公开文章</span>
              <span>{loading ? "…" : published.length}</span>
            </li>
            <li>
              <span className="status-label">公开计划</span>
              <span>{loading ? "…" : (plans || []).length}</span>
            </li>
            <li>
              <span className="status-label">登录状态</span>
              <span className={user ? "status-ok" : "status-muted"}>
                {user ? `已登录 · ${user.username}` : "未登录"}
              </span>
            </li>
            <li>
              <span className="status-label">后端服务</span>
              <span className={health?.status === "ok" ? "status-ok" : "status-muted"}>
                {health?.status === "ok" ? "运行正常" : "暂不可用"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 统计卡：全部来自真实数据，数量为 0 时显示空状态 */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">{loading ? "…" : published.length}</div>
          <div className="stat-label">已发布文章</div>
          {!loading && published.length === 0 && (
            <p className="stat-hint">等待第一篇</p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-num">{loading ? "…" : (plans || []).length}</div>
          <div className="stat-label">公开计划</div>
          {!loading && (plans || []).length === 0 && (
            <p className="stat-hint">还没有计划</p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-num">{loading ? "…" : notes.length}</div>
          <div className="stat-label">技术笔记</div>
          {!loading && notes.length === 0 && (
            <p className="stat-hint">暂无笔记</p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-num">
            {health?.status === "ok" ? "✅" : "⚠️"}
          </div>
          <div className="stat-label">后端服务</div>
          <p className="stat-hint">
            {health?.status === "ok" ? "运行正常" : "暂不可用"}
          </p>
        </div>
      </div>

      {/* 当前正在发生什么：全部真实接入状态 */}
      <section className="home-module">
        <h2>📡 当前正在发生什么</h2>
        <div className="whats-on">
          <span className="whats-item on">✅ 文章系统已接入</span>
          <span className="whats-item on">✅ 计划系统已接入</span>
          <span className="whats-item on">✅ GitHub 登录已接入</span>
          <span className="whats-item on">✅ 自动部署已接入</span>
        </div>
      </section>

      {/* 最近更新：真实版本记录 */}
      <section className="home-module">
        <h2>🕘 最近更新</h2>
        <ul className="updates-list">
          {UPDATES.map((u) => (
            <li key={u.version}>
              <span className="updates-version">{u.version}</span>
              <span className="updates-date">{u.date}</span>
              <span className="updates-text">{u.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 最近文章：真实数据，没有就显示空引导 */}
      <section className="home-module">
        <h2>📝 最近文章</h2>
        {loading ? (
          <p className="empty-inline">加载中…</p>
        ) : published.length === 0 ? (
          <p className="empty-inline">
            还没有文章。管理员登录后，在「管理」里写下第一篇吧。
          </p>
        ) : (
          <ul className="article-list" style={{ gap: 10 }}>
            {recentArticles.map((a) => (
              <li key={a.id}>
                <a className="article-card" href={`#/articles/${a.id}`}>
                  <div className="article-card-head">
                    <span className="article-title">{a.title}</span>
                    {a.category && <span className="tag">{a.category}</span>}
                  </div>
                  <span className="article-date">
                    更新于 {new Date(a.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {!loading && published.length > 3 && (
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href="#/articles">
              查看全部文章 →
            </a>
          </div>
        )}
      </section>

      {/* 快捷入口 */}
      <section className="home-module">
        <h2>⚡ 快捷入口</h2>
        <div className="home-links">
          <a className="btn" href="#/notes">
            🗂️ 技术笔记
          </a>
          <a className="btn" href="#/toolbox">
            🧰 工具箱
          </a>
          <a className="btn" href="#/game">
            🎮 游戏
          </a>
          <a className="btn" href="#/music">
            🎵 音乐台
          </a>
          {user && user.is_admin && (
            <a className="btn btn-primary" href="#/admin">
              ✍️ 写文章
            </a>
          )}
        </div>
      </section>

      {/* 项目说明 */}
      <section className="home-module">
        <h2>📌 关于本站</h2>
        <p className="empty-inline">
          当前网站部署在 <code>chenji.felixfu.xyz</code>，使用{" "}
          <code>React + FastAPI + Docker + GitHub Actions</code> 构建。
          内容保存在服务器数据库里，不依赖浏览器本地存储。
        </p>
      </section>
    </div>
  );
}
