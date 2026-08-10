import { useState } from "react";
import { useMusicPlayer } from "../context/MusicPlayerContext.jsx";

// 个人音乐台：把喜欢的歌放进站点里，打开网页就能听。
// - 站内音乐库：frontend/src/data/music.js 登记 frontend/public/music/ 下的真实音频文件
// - 用户歌单：存 localStorage（前端状态），不接后端，不影响文章/计划/登录
// - 没有真实音频文件 → 显示空状态，不放假歌曲
// - 播放由全站全局播放器（MusicPlayerContext）负责：切换页面音乐不会停止
const PLAYLIST_MODES = [
  { key: "list", label: "列表循环", icon: "🔁" },
  { key: "one", label: "单曲循环", icon: "🔂" },
  { key: "shuffle", label: "随机播放", icon: "🔀" },
];

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function Music() {
  const {
    playlists,
    currentTrack,
    currentPlaylistId,
    isPlaying,
    currentTime,
    duration,
    mode,
    setMode,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    addPlaylist,
    removePlaylist,
    flacSupported,
  } = useMusicPlayer();

  const [newName, setNewName] = useState("");

  const hasTracks = playlists.some((p) => (p.tracks || []).length > 0);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const modeLabel = PLAYLIST_MODES.find((m) => m.key === mode);

  // 顶部按钮：列表循环 → 单曲循环 → 随机播放
  const cycleMode = () => {
    const i = PLAYLIST_MODES.findIndex((x) => x.key === mode);
    setMode(PLAYLIST_MODES[(i + 1) % PLAYLIST_MODES.length].key);
  };

  const handleAddPlaylist = (e) => {
    e.preventDefault();
    addPlaylist(newName);
    setNewName("");
  };

  const handleRemovePlaylist = (id) => {
    if (!window.confirm("确定删除这个歌单？删除后无法恢复。")) return;
    removePlaylist(id);
  };

  // 点击进度条跳转
  const onSeekBar = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || duration <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  return (
    <div className="music">
      <div className="music-head">
        <div>
          <h1 className="page-title">个人音乐台</h1>
          <p className="page-sub">这里可以放我自己有权使用的音乐、练习音频、环境音或跑步歌单。</p>
        </div>
        {hasTracks && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={cycleMode}
            title={`当前：${modeLabel.label}`}
          >
            {modeLabel.icon} {modeLabel.label}
          </button>
        )}
      </div>

      {/* 当前播放卡片 */}
      <div className={`music-now ${currentTrack ? "" : "empty"}`}>
        <div className="music-cover">{currentTrack ? "🎶" : "🎵"}</div>
        <div className="music-now-info">
          <div className="music-now-title">
            {currentTrack ? currentTrack.title : "还没有在播放的音乐"}
          </div>
          <div className="music-now-sub">
            {currentTrack ? (
              <>
                {isPlaying ? "正在播放" : "已暂停"}
                {currentTrack.src?.toLowerCase().endsWith(".flac") && !flacSupported && (
                  <span className="muted">
                    {" "}
                    · 当前浏览器不支持 flac，建议转成 mp3 后替换文件
                  </span>
                )}
              </>
            ) : (
              "在下方歌单选择一首歌后，这里会显示正在播放的内容"
            )}
          </div>
        </div>

        <div className="music-progress" onClick={onSeekBar} title="点击跳转进度">
          <div className="music-progress-bar">
            <div className="music-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="music-progress-label">
            {currentTrack ? `${fmtTime(currentTime)} / ${fmtTime(duration)}` : "0:00 / 0:00"}
          </span>
        </div>

        <div className="music-controls">
          <button
            type="button"
            className="music-btn"
            onClick={prevTrack}
            disabled={!hasTracks}
            title="上一首"
          >
            ⏮
          </button>
          <button
            type="button"
            className="music-btn music-btn-play"
            onClick={togglePlay}
            disabled={!currentTrack && !hasTracks}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            className="music-btn"
            onClick={nextTrack}
            disabled={!hasTracks}
            title="下一首"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* 歌单区 */}
      <section className="music-playlists">
        <div className="music-playlists-head">
          <h2>歌单</h2>
          <form className="music-new-form" onSubmit={handleAddPlaylist}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新歌单名称（如：学习 BGM）"
              maxLength={30}
            />
            <button type="submit" className="btn btn-sm">
              + 新建
            </button>
          </form>
        </div>

        {playlists.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎵</span>
            <h2>暂未添加音乐</h2>
            <p>
              你可以把自己的 mp3 / wav / ogg / flac 文件放到{" "}
              <code>frontend/public/music/</code>，然后在音乐数据文件中登记。
            </p>
          </div>
        ) : (
          <div className="playlist-list">
            {playlists.map((pl) => {
              const isCurrent = currentPlaylistId === pl.id;
              return (
                <div key={pl.id} className={`playlist-card${isCurrent ? " active" : ""}`}>
                  <div className="playlist-head">
                    <span className="playlist-name">🎧 {pl.name}</span>
                    {!pl.builtin && (
                      <button
                        type="button"
                        className="playlist-del"
                        onClick={() => handleRemovePlaylist(pl.id)}
                        title="删除歌单"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {(pl.tracks || []).length === 0 ? (
                    <p className="muted playlist-empty">这个歌单还没有歌。</p>
                  ) : (
                    <ul className="playlist-tracks">
                      {(pl.tracks || []).map((t, i) => {
                        const isThis =
                          isCurrent && currentTrack?.id === t.id;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              className={`track-row${isThis ? " playing" : ""}`}
                              onClick={() => playTrack(pl.id, i)}
                            >
                              <span className="track-idx">
                                {isThis ? "▶" : i + 1}
                              </span>
                              <span className="track-title">{t.title}</span>
                              <span className="track-src">
                                {t.src ? "已就绪" : "无音源"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!hasTracks && (
          <p className="muted music-note">
            如何添加音乐：把音频文件放到 <code>frontend/public/music/</code>，
            然后在 <code>frontend/src/data/music.js</code> 里添加 title、artist、src，
            运行 <code>npm run build</code> 检查，commit + push 后自动部署。
            支持 mp3 / wav / ogg / flac，只放自己有权的音乐（原创 / 授权 / 免费可商用），不放版权歌曲。
          </p>
        )}
      </section>
    </div>
  );
}
