import { useMusicPlayer } from "../context/MusicPlayerContext.jsx";

// 迷你音乐播放器：固定在侧边栏底部，读取全站全局播放器状态。
// 与音乐页共用同一个全局 audio，离开音乐页后音乐继续播放。
export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    error,
    flacSupported,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
  } = useMusicPlayer();

  const hasTrack = !!currentTrack;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // 点击进度条跳转
  const onSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || duration <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  return (
    <div className="mini-player">
      <a className="mini-player-top" href="#/music" title="个人音乐台">
        <span className="mini-player-icon">
          {hasTrack && isPlaying ? (
            <span className="mini-eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            "🎵"
          )}
        </span>
        <span className="mini-player-info">
          <span className="mini-player-title">
            {hasTrack ? currentTrack.title : "暂无音乐"}
          </span>
          <span className="mini-player-sub">
            {error
              ? "音频加载失败"
              : hasTrack
                ? isPlaying
                  ? "正在播放"
                  : "已暂停"
                : "前往音乐台添加"}
          </span>
        </span>
      </a>

      <div className="mini-player-controls">
        <button
          type="button"
          className="mini-player-btn"
          onClick={prevTrack}
          disabled={!hasTrack}
          title="上一首"
          aria-label="上一首"
        >
          ⏮
        </button>
        <button
          type="button"
          className="mini-player-btn mini-player-play"
          onClick={togglePlay}
          title={isPlaying ? "暂停" : "播放"}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className="mini-player-btn"
          onClick={nextTrack}
          disabled={!hasTrack}
          title="下一首"
          aria-label="下一首"
        >
          ⏭
        </button>
      </div>

      <div
        className="mini-player-progress"
        onClick={onSeek}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime || 0)}
        title="点击跳转进度"
      >
        <div className="mini-player-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {hasTrack &&
        currentTrack.src?.toLowerCase().endsWith(".flac") &&
        !flacSupported && (
          <span className="mini-player-flac">当前浏览器不支持 flac，建议转 mp3</span>
        )}
    </div>
  );
}
