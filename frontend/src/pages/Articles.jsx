import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// 技术笔记分类约定（与 Notes 页一致）
const NOTE_CATEGORIES = ["技术笔记", "笔记"];

export default function Articles() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    api
      .listArticles()
      .then(setArticles)
      .catch((e) => setError(e.message));
  }, []);

  // 筛选维度全部来自真实文章数据
  const facets = useMemo(() => {
    const list = articles || [];
    const tags = new Set();
    const cats = new Set();
    const months = new Set();
    for (const a of list) {
      (a.tags || []).forEach((t) => tags.add(t));
      if (a.category) cats.add(a.category);
      if (a.created_at) months.add(a.created_at.slice(0, 7));
    }
    return {
      tags: [...tags].sort(),
      cats: [...cats].sort(),
      months: [...months].sort().reverse(),
    };
  }, [articles]);

  // 访客只看已发布；搜索标题/正文/标签，叠加标签、分类、月份筛选
  const filtered = useMemo(() => {
    const list = (articles || []).filter((a) => a.status === "published");
    const q = search.trim().toLowerCase();
    return list.filter((a) => {
      if (q) {
        const hay = `${a.title} ${a.content || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tagFilter !== "all" && !(a.tags || []).includes(tagFilter)) return false;
      if (catFilter !== "all" && a.category !== catFilter) return false;
      if (monthFilter !== "all" && !(a.created_at || "").startsWith(monthFilter)) return false;
      return true;
    });
  }, [articles, search, tagFilter, catFilter, monthFilter]);

  const techCount = (articles || []).filter(
    (a) => a.status === "published" && NOTE_CATEGORIES.includes(a.category)
  ).length;
  const essayCount = (articles || []).filter(
    (a) => a.status === "published" && !NOTE_CATEGORIES.includes(a.category)
  ).length;

  const resetFilters = () => {
    setSearch("");
    setTagFilter("all");
    setCatFilter("all");
    setMonthFilter("all");
  };

  if (error) return <div className="error-box">加载失败：{error}</div>;
  if (articles === null) return <div className="loading">加载中…</div>;

  return (
    <div className="articles">
      <div className="articles-head">
        <div>
          <h1 className="page-title">文章中心</h1>
          <p className="page-sub">让学习笔记和项目记录分开看。</p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题、正文或标签"
            aria-label="搜索文章"
          />
        </div>
      </div>

      {/* 真实分类统计卡 */}
      <div className="stat-cards stat-cards-sm">
        <div className="stat-card">
          <div className="stat-num">{essayCount}</div>
          <div className="stat-label">随笔 / 生活文章</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{techCount}</div>
          <div className="stat-label">技术笔记</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{articles.length}</div>
          <div className="stat-label">全部已发布内容</div>
        </div>
      </div>

      {/* 筛选区：有真实数据才展示对应筛选条 */}
      {(facets.tags.length > 0 || facets.cats.length > 0 || facets.months.length > 0) && (
        <div className="filter-panel">
          {facets.cats.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">分类</span>
              <div className="filter-chips">
                <button
                  className={`filter-chip${catFilter === "all" ? " active" : ""}`}
                  onClick={() => setCatFilter("all")}
                >
                  全部
                </button>
                {facets.cats.map((c) => (
                  <button
                    key={c}
                    className={`filter-chip${catFilter === c ? " active" : ""}`}
                    onClick={() => setCatFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {facets.tags.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">标签</span>
              <div className="filter-chips">
                <button
                  className={`filter-chip${tagFilter === "all" ? " active" : ""}`}
                  onClick={() => setTagFilter("all")}
                >
                  全部
                </button>
                {facets.tags.map((t) => (
                  <button
                    key={t}
                    className={`filter-chip${tagFilter === t ? " active" : ""}`}
                    onClick={() => setTagFilter(t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {facets.months.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">月份</span>
              <div className="filter-chips">
                <button
                  className={`filter-chip${monthFilter === "all" ? " active" : ""}`}
                  onClick={() => setMonthFilter("all")}
                >
                  全部
                </button>
                {facets.months.map((m) => (
                  <button
                    key={m}
                    className={`filter-chip${monthFilter === m ? " active" : ""}`}
                    onClick={() => setMonthFilter(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h2>没有符合筛选的文章</h2>
          <p>换一个搜索词或清空筛选条件试试。</p>
          <button className="btn" onClick={resetFilters}>
            清空筛选
          </button>
        </div>
      ) : (
        <>
          <p className="muted results-count">共 {filtered.length} 篇文章</p>
          <ul className="article-list">
            {filtered.map((a) => (
              <li key={a.id}>
                <a className="article-card" href={`#/articles/${a.id}`}>
                  <div className="article-card-head">
                    <span className="article-title">{a.title}</span>
                    {a.category && <span className="tag">{a.category}</span>}
                    <span className="article-date">
                      {new Date(a.created_at).toLocaleDateString("zh-CN")}
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
        </>
      )}
    </div>
  );
}
