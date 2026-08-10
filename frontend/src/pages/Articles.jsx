import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Articles() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listArticles()
      .then(setArticles)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">加载失败：{error}</div>;
  if (articles === null) return <div className="loading">加载中…</div>;

  return (
    <div className="articles">
      <h1 className="page-title">文章</h1>
      <p className="page-sub">已发布的内容，点击卡片查看全文。</p>
      {articles.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h2>这里还没有文章</h2>
          <p>
            内容只来自真实写作，不存在假文章。管理员登录后，在「管理」后台写下第一篇吧。
          </p>
          <a className="btn btn-primary" href="#/admin">
            前往管理后台
          </a>
        </div>
      ) : (
        <ul className="article-list">
          {articles.map((a) => (
            <li key={a.id}>
              <a className="article-card" href={`#/articles/${a.id}`}>
                <div className="article-card-head">
                  <span className="article-title">{a.title}</span>
                  {a.category && <span className="tag">{a.category}</span>}
                  <span className="article-date">
                    更新于 {new Date(a.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                {a.summary && <p className="article-summary">{a.summary}</p>}
                {a.tags && a.tags.length > 0 && (
                  <div className="article-tags">
                    {a.tags.map((t, i) => (
                      <span key={i} className="tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
