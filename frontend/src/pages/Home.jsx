import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Home({ user }) {
  const [articles, setArticles] = useState(null);
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    Promise.all([api.listArticles(), api.listPlans()])
      .then(([a, p]) => {
        setArticles(a);
        setPlans(p);
      })
      .catch(() => {
        // 后端不可用时置空数组，页面仍能渲染空状态而不是崩掉
        setArticles([]);
        setPlans([]);
      });
  }, []);

  const loading = articles === null || plans === null;
  const recentArticles = (articles || []).slice(0, 3);

  return (
    <div className="home">
      <section className="hero">
        <h1>Chenji Learning Hub</h1>
        <p>记录学习、项目和计划的个人工作台。访客可以浏览文章与公开计划，管理员登录后维护内容。</p>
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

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">{loading ? "…" : articles.length}</div>
          <div className="stat-label">已发布文章</div>
          {!loading && articles.length === 0 && (
            <p className="stat-hint">等待第一篇</p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-num">{loading ? "…" : plans.length}</div>
          <div className="stat-label">公开计划</div>
          {!loading && plans.length === 0 && (
            <p className="stat-hint">还没有计划</p>
          )}
        </div>
      </div>

      <section className="home-module">
        <h2>📝 最近文章</h2>
        {loading ? (
          <p className="empty-inline">加载中…</p>
        ) : recentArticles.length === 0 ? (
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
        {!loading && articles.length > 3 && (
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href="#/articles">
              查看全部文章 →
            </a>
          </div>
        )}
      </section>

      <section className="home-module">
        <h2>🗓️ 近期计划</h2>
        {loading ? (
          <p className="empty-inline">加载中…</p>
        ) : plans.length === 0 ? (
          <p className="empty-inline">
            还没有公开计划。管理员登录后，在「计划」里按日期安排每一天。
          </p>
        ) : (
          <p className="empty-inline" style={{ margin: 0 }}>
            共 <b>{plans.length}</b> 条公开计划，最新一条是{" "}
            <b>{plans[plans.length - 1].date}</b> 的「{plans[plans.length - 1].title}」。
          </p>
        )}
        {!loading && plans.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href="#/plans">
              查看计划日历 →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
