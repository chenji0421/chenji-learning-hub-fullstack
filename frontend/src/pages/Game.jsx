export default function Game() {
  return (
    <div className="game">
      <h1 className="page-title">游戏</h1>
      <p className="page-sub">自制小游戏的入口，先把学习工作台搭建好再慢慢填满这里。</p>

      <div className="empty-state">
        <span className="empty-icon">🎮</span>
        <h2>暂未接入游戏</h2>
        <p>
          这里会放用 HTML / Canvas 写的小游戏。暂时没有真实游戏内容，所以先保持空状态，
          不会塞一些用不了的占位游戏链接。
        </p>
      </div>

      <div className="game-frame-placeholder">
        <p>🧩 iframe 容器已预留</p>
        <p className="muted">接入第一个游戏后，会在这个区域直接展示。</p>
      </div>
    </div>
  );
}
