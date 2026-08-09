import { useEffect, useState } from "react";
import { api } from "../api.js";

// 极简 Markdown 渲染：只支持 #/## 标题、- 无序列表、段落。
// 第一版不引入 Markdown 库，够用即可。
function renderMarkdown(text) {
  const lines = (text || "").split("\n");
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = out.length;
    if (trimmed.startsWith("# ")) out.push(<h2 key={key}>{trimmed.slice(2)}</h2>);
    else if (trimmed.startsWith("## ")) out.push(<h3 key={key}>{trimmed.slice(3)}</h3>);
    else if (trimmed.startsWith("- ")) out.push(<li key={key}>{trimmed.slice(2)}</li>);
    else if (trimmed.startsWith("> ")) out.push(<blockquote key={key}>{trimmed.slice(2)}</blockquote>);
    else out.push(<p key={key}>{trimmed}</p>);
  }
  return out;
}

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
        <span>更新于 {new Date(article.updated_at).toLocaleDateString("zh-CN")}</span>
      </div>
      {article.summary && <p className="article-lead">{article.summary}</p>}
      <div className="article-body">{renderMarkdown(article.content)}</div>
    </article>
  );
}
