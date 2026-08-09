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
      <h1>文章</h1>
      {articles.length === 0 ? (
        <div className="empty-state">
          <h2>这里还没有文章</h2>
          <p>
            管理员登录后可以在这里写文章。内容直接存在数据库里，
            不会出现假文章、假浏览量、假阅读时间。
          </p>
        </div>
      ) : (
        <ul className="article-list">
          {articles.map((a) => (
            <li key={a.id}>
              <a className="article-card" href={`#/articles/${a.id}`}>
                <div className="article-title">{a.title}</div>
                <div>
                  {a.category && <span className="tag">{a.category}</span>}
                  <span className="article-date">
                    {new Date(a.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                {a.summary && <p className="article-summary">{a.summary}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
