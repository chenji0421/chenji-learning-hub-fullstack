import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([api.listArticles(), api.listPlans()])
      .then(([articles, plans]) =>
        setStats({ articleCount: articles.length, planCount: plans.length })
      )
      .catch(() => setStats({ articleCount: 0, planCount: 0 }));
  }, []);

  return (
    <div className="home">
      <h1>欢迎来到我的学习工作台</h1>
      <p>
        这里记录我写网站、写文章、做计划的过程。访客可以看文章和计划；
        管理员（GitHub 用户名 <code>chenji0421</code>）登录后可以管理内容。
      </p>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">{stats ? stats.articleCount : "…"}</div>
          <div className="stat-label">篇文章</div>
          {stats?.articleCount === 0 && <p className="stat-hint">等待第一篇文章</p>}
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats ? stats.planCount : "…"}</div>
          <div className="stat-label">条公开计划</div>
          {stats?.planCount === 0 && <p className="stat-hint">还没有公开计划</p>}
        </div>
      </div>

      <div className="home-links">
        <a className="btn" href="#/articles">
          看文章
        </a>
        <a className="btn" href="#/plans">
          看计划
        </a>
      </div>
    </div>
  );
}
