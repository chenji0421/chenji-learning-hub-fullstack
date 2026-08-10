import { useEffect, useState } from "react";
import { api } from "../api.js";
import renderMarkdown from "../markdown.jsx";

export default function ArticleDetail({ id }) {
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setArticle(null);
    api
      .getArticle(id)
      .then(setArticle)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!article) return <div className="loading">加载中…</div>;

  return (
    <article className="article-detail">
      <a href="#/articles" className="back-link">
        ← 返回文章列表
      </a>
      <h1>{article.title}</h1>
      <div className="article-meta">
        {article.category && <span className="tag">{article.category}</span>}
        {article.tags &&
          article.tags.length > 0 &&
          article.tags.map((t, i) => (
            <span key={i} className="tag">
              #{t}
            </span>
          ))}
        <span>更新于 {new Date(article.updated_at).toLocaleDateString("zh-CN")}</span>
      </div>
      {article.summary && <p className="article-lead">{article.summary}</p>}
      <div className="article-body">{renderMarkdown(article.content)}</div>
    </article>
  );
}
