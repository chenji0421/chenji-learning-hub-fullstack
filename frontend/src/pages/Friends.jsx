import { friends } from "../data/friends.js";

// 友人 / 友链：只放真实的朋友网站和常访问的个人站点。
// 外链一律新标签页打开，只做入口，不复制对方内容。
export default function Friends() {
  return (
    <div className="friends page">
      <div className="changelog-head">
        <h1 className="page-title">友人链接</h1>
        <p className="page-sub">这里放一些朋友的网站和我常访问的个人站点</p>
      </div>

      {friends.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🤝</span>
          <h2>还没有友链</h2>
          <p>以后认识的同好网站会陆续加到这里。</p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((f, i) => (
            <a
              key={i}
              className="friend-card"
              href={f.url}
              target="_blank"
              rel="noreferrer"
              title={f.url}
            >
              <div className="friend-card-head">
                <span className="friend-avatar">🌐</span>
                <h3 className="friend-name">{f.name}</h3>
                <span className="friend-go">访问网站 ↗</span>
              </div>
              <p className="friend-desc">{f.description}</p>
              {f.tags && f.tags.length > 0 && (
                <div className="friends-tags">
                  {f.tags.map((t, j) => (
                    <span key={j} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
