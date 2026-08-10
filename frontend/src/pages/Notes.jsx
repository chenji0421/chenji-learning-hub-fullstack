import { useEffect, useState } from "react";
import { api } from "../api.js";

// 技术笔记与普通文章共用 Article 模型，用 category 区分。
// 约定分类为「技术笔记」或「笔记」的文章归入技术笔记中心。
const NOTE_CATEGORIES = ["技术笔记", "笔记"];

export default function Notes() {
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

  const notes = (articles || []).filter(
    (a) => a.status === "published" && NOTE_CATEGORIES.includes(a.category)
  );

  return (
    <div className="notes">
      <h1 className="page-title">技术笔记</h1>
      <p className="page-sub">
        课程笔记、项目文档和代码学习记录。分类为「技术笔记 / 笔记」的文章会归到这里。
      </p>

      {notes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗂️</span>
          <h2>还没有技术笔记</h2>
          <p>
            内容只来自真实写作。管理员在后台新建文章时，把分类填为「技术笔记」，
            发布后就会出现在这里。
          </p>
        </div>
      ) : (
        <ul className="article-list">
          {notes.map((a) => (
            <li key={a.id}>
              <a className="article-card" href={`#/articles/${a.id}`}>
                <div className="article-card-head">
                  <span className="article-title">{a.title}</span>
                  {a.tags && a.tags.length > 0 && (
                    <span className="tag">{a.tags[0]}</span>
                  )}
                  <span className="article-date">
                    更新于 {new Date(a.updated_at).toLocaleDateString("zh-CN")}
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
