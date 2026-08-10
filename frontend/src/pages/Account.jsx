export default function Account({ user, onLogout }) {
  if (!user) {
    return (
      <div className="account">
        <h1 className="page-title">账号中心</h1>
        <p className="page-sub">查看登录账号信息、角色和权限。</p>
        <div className="empty-state">
          <span className="empty-icon">🔑</span>
          <h2>还没有登录</h2>
          <p>使用 GitHub 账号登录后，可以在这里查看你的账号信息和角色。</p>
          <a className="btn btn-primary" href="#/login">
            去登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="account">
      <h1 className="page-title">账号中心</h1>
      <p className="page-sub">当前登录的账号信息。</p>

      <div className="account-card">
        <img
          src={user.avatar_url}
          alt=""
          width="72"
          height="72"
          className="account-avatar"
        />
        <div className="account-info">
          <div className="account-name">{user.name || user.username}</div>
          <div className="account-username">@{user.username}</div>
          <div className="account-role">
            {user.is_admin ? (
              <span className="role-badge">管理员</span>
            ) : (
              <span className="badge badge-reader">读者</span>
            )}
            <span className="muted"> · GitHub OAuth 登录</span>
          </div>
          {!user.is_admin && (
            <p className="account-no-admin">暂无管理权限。只有 <code>chenji0421</code> 可以进入管理后台。</p>
          )}
        </div>
      </div>

      <div className="account-actions">
        {user.is_admin && (
          <a className="btn btn-primary" href="#/admin">
            ⚙️ 进入管理后台
          </a>
        )}
        <button className="btn" onClick={onLogout}>
          退出登录
        </button>
      </div>

      <div className="account-note muted">
        账号基于 GitHub 授权登录，角色由后端按用户名判断。只有{" "}
        <code>chenji0421</code> 是管理员，其他登录用户为读者，只能浏览内容。
      </div>
    </div>
  );
}
