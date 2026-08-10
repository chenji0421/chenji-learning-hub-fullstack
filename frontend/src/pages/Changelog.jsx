import { changelog } from "../data/changelog.js";

// 类型标签配色：新增绿 / 优化蓝 / 修复橙 / 部署紫 / 文档灰
const TYPE_CLASS = {
  新增: "new",
  优化: "opt",
  修复: "fix",
  部署: "deploy",
  文档: "doc",
};

export default function Changelog() {
  const latest = changelog.length > 0 ? changelog[0] : null;

  return (
    <div className="changelog page">
      {/* 顶部说明卡 */}
      <div className="changelog-head">
        <h1 className="page-title">更新日志</h1>
        <p className="page-sub">记录沉积 Learning Hub 的每一次变化</p>
        {latest && (
          <div className="changelog-current">
            <span className="badge badge-pub">当前版本 {latest.version}</span>
            <span className="changelog-current-date">最近更新：{latest.date}</span>
          </div>
        )}
      </div>

      {/* 空状态：没有任何更新记录时显示 */}
      {changelog.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📜</span>
          <h2>暂无更新记录</h2>
          <p>版本演进会记录在这里。</p>
        </div>
      ) : (
        /* 时间线：最新版本在最上面 */
        <div className="changelog-timeline">
          {changelog.map((entry) => (
            <article key={entry.version} className="changelog-card">
              <div className="changelog-head-row">
                <span className="changelog-version">{entry.version}</span>
                <span
                  className={`type-tag type-${TYPE_CLASS[entry.type] || "doc"}`}
                >
                  {entry.type}
                </span>
                <span className="changelog-date">{entry.date}</span>
              </div>
              <h2 className="changelog-title">{entry.title}</h2>
              {entry.summary && <p className="changelog-summary">{entry.summary}</p>}
              {Array.isArray(entry.items) && entry.items.length > 0 && (
                <ul className="changelog-items">
                  {entry.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
