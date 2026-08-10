import { useEffect, useState } from "react";
import { api } from "../api.js";

// 首页的技术笔记计数与 Notes 页保持同一分类约定
const NOTE_CATEGORIES = ["技术笔记", "笔记"];

export default function Home({ user }) {
  const [articles, setArticles] = useState(null);
  const [plans, setPlans] = useState(null);
  const [health, setHealth] = useState(null);

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
  }, []);

  const loading = articles === null || plans === null;
  const published = (articles || []).filter((a) => a.status === "published");
  const notes = published.filter((a) => NOTE_CATEGORIES.includes(a.category));
  const recentArticles = published.slice(0, 3);
  const recentPlan = plans && plans.length > 0 ? plans[plans.length - 1] : null;

  return (
    <div className="home">
      {/* Hero 区：标题 + 副标题 + 简介 + 快捷入口 */}
      <section className="hero">
        <h1>Chenji Learning Hub</h1>
        <p className="hero-sub">记录学习、项目和计划的个人工作台</p>
        <p className="hero-intro">
          非计算机专业学生，正在学习 Python、前端开发、FastAPI 和数据分析。
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#/articles">
            📝 查看文章
          </a>
          <a className="btn" href="#/plans">
            🗓️ 查看计划
          </a>
          {user ? (
            <a className="btn" href="#/admin">
              ⚙️ 管理后台
            </a>
          ) : (
            <a className="btn" href="#/login">
              🔑 登录
            </a>
          )}
        </div>
      </section>

      {/* 状态卡：全部来自真实数据，数量为 0 时显示空状态 */}
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
            {health && health.status === "ok" ? "✅" : "⚠️"}
          </div>
          <div className="stat-label">后端服务</div>
          <p className="stat-hint">
            {health && health.status === "ok" ? "运行正常" : "暂不可用"}
          </p>
        </div>
      </div>

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

      {/* 近期计划：真实数据，没有就显示空引导 */}
      <section className="home-module">
        <h2>🗓️ 近期计划</h2>
        {loading ? (
          <p className="empty-inline">加载中…</p>
        ) : (plans || []).length === 0 ? (
          <p className="empty-inline">
            还没有公开计划。管理员登录后，在「计划」里按日期安排每一天。
          </p>
        ) : (
          <p className="empty-inline" style={{ margin: 0 }}>
            共 <b>{(plans || []).length}</b> 条公开计划，最新一条是{" "}
            <b>{recentPlan.date}</b> 的「{recentPlan.title}」。
          </p>
        )}
        {!loading && (plans || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href="#/plans">
              查看计划日历 →
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
