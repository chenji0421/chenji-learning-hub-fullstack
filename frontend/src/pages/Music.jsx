import { useEffect, useRef, useState } from "react";

// 个人音乐台：把喜欢的歌放进站点里，打开网页就能听。
// - 音乐数据存 localStorage（前端状态），不接后端，不影响文章/计划/登录
// - 默认没有真实音乐文件 → 显示空状态，不放假歌曲
// - 接入真实音频：给歌单里的 track 填上 src（本地 assets/music 或线上 URL）即可播放
const PLAYLISTS_KEY = "chl_music_playlists";
const PLAYER_KEY = "chl_music_player";

const PLAYLIST_MODES = [
  { key: "list", label: "列表循环", icon: "🔁" },
  { key: "one", label: "单曲循环", icon: "🔂" },
  { key: "shuffle", label: "随机播放", icon: "🔀" },
];

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

export default function Music() {
  const [playlists, setPlaylists] = useState(() => readJSON(PLAYLISTS_KEY, []));
  // player: { playlistId, index, playing } —— 正在播放哪首歌
  const [player, setPlayer] = useState(() => readJSON(PLAYER_KEY, null));
  const [mode, setMode] = useState("list");
  const [newName, setNewName] = useState("");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  // 持久化歌单 / 播放状态，播放状态变化时通知迷你播放器同步
  useEffect(() => {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  }, [playlists]);
  // 迷你播放器读的是同一把 localStorage 钥匙，但需要带上歌名才能显示，
  // 否则底部播放器永远只会显示「暂无音乐」
  useEffect(() => {
    const stored = (() => {
      if (!player) return null;
      const pl = playlists.find((p) => p.id === player.playlistId);
      const track = pl && (pl.tracks || [])[player.index];
      return track ? { ...player, title: track.title, src: track.src } : player;
    })();
    localStorage.setItem(PLAYER_KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event("music:changed"));
  }, [player, playlists]);

  // 当前播放的曲目
  const currentTrack = (() => {
    if (!player) return null;
    const pl = playlists.find((p) => p.id === player.playlistId);
    if (!pl) return null;
    return pl.tracks[player.index] || null;
  })();

  // 有没有任何一首真实音轨
  const hasTracks = playlists.some((p) => (p.tracks || []).length > 0);

  // 播放/暂停：有音频地址就交给 <audio>，没有就只更新状态（诚实标注为「无音源占位」）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (currentTrack.src) {
      audio.src = currentTrack.src;
      audio.volume = 0.7;
      if (player?.playing) audio.play().catch(() => {});
      else audio.pause();
    } else {
      // 没有真实音源：进度条走个动画示意，不发声
      setProgress(0);
    }
  }, [currentTrack?.id, player?.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // 计时器：无音源时模拟进度；有音源时跟随 audio timeupdate
  useEffect(() => {
    const audio = audioRef.current;
    const tick = () => {
      if (currentTrack?.src && audio?.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      } else if (currentTrack && player?.playing && !currentTrack.src) {
        setProgress((p) => (p >= 100 ? 0 : p + 0.5));
      }
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [currentTrack, player?.playing]);

  const addPlaylist = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setPlaylists((ps) => [
      ...ps,
      { id: `pl-${Date.now()}`, name, tracks: [], createdAt: new Date().toISOString() },
    ]);
    setNewName("");
  };

  const removePlaylist = (id) => {
    if (!window.confirm("确定删除这个歌单？歌单是空的，删除后无法恢复。")) return;
    setPlaylists((ps) => ps.filter((p) => p.id !== id));
    if (player?.playlistId === id) setPlayer(null);
  };

  // 上一首 / 下一首：按当前模式循环
  const step = (delta) => {
    if (!hasTracks) return;
    const flat = playlists.flatMap((p) =>
      (p.tracks || []).map((t) => ({ playlistId: p.id, track: t }))
    );
    if (flat.length === 0) return;
    let idx = 0;
    if (player) {
      idx = flat.findIndex(
        (x) => x.playlistId === player.playlistId && x.track.id === currentTrack?.id
      );
      if (idx < 0) idx = 0;
    }
    let next = idx + delta;
    if (mode === "shuffle") next = Math.floor(Math.random() * flat.length);
    else if (next < 0) next = flat.length - 1;
    else if (next >= flat.length) next = 0;
    const target = flat[next];
    setPlayer({
      playlistId: target.playlistId,
      index: playlists
        .find((p) => p.id === target.playlistId)
        .tracks.findIndex((t) => t.id === target.track.id),
      playing: true,
    });
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setPlayer((p) => (p ? { ...p, playing: !p.playing } : p));
  };

  const playTrack = (plId, idx) => {
    setPlayer({ playlistId: plId, index: idx, playing: true });
  };

  const modeLabel = PLAYLIST_MODES.find((m) => m.key === mode);

  return (
    <div className="music">
      <div className="music-head">
        <div>
          <h1 className="page-title">个人音乐台</h1>
          <p className="page-sub">把喜欢的歌放进站点里，打开网页就能听。</p>
        </div>
        {hasTracks && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setMode((m) => PLAYLIST_MODES[(PLAYLIST_MODES.findIndex((x) => x.key === m) + 1) % 3].key)}
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
            {currentTrack
              ? currentTrack.src
                ? player?.playing
                  ? "正在播放"
                  : "已暂停"
                : "这条曲目还没有音源文件，播放为占位状态"
              : "在下方歌单添加曲目后，这里会显示正在播放的内容"}
          </div>
        </div>

        <div className="music-progress">
          <div className="music-progress-bar">
            <div className="music-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="music-progress-label">
            {currentTrack && !currentTrack.src && player?.playing ? "占位进度" : `${Math.round(progress)}%`}
          </span>
        </div>

        <div className="music-controls">
          <button
            type="button"
            className="music-btn"
            onClick={() => step(-1)}
            disabled={!hasTracks}
            title="上一首"
          >
            ⏮
          </button>
          <button
            type="button"
            className="music-btn music-btn-play"
            onClick={togglePlay}
            disabled={!currentTrack}
            title={player?.playing ? "暂停" : "播放"}
          >
            {player?.playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            className="music-btn"
            onClick={() => step(1)}
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
          <form className="music-new-form" onSubmit={addPlaylist}>
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
            <h2>还没有歌单</h2>
            <p>
              新建一个歌单，以后把自己的音频文件放进来就能在这里听了。
              当前没有真实音乐，所以这里保持空状态。
            </p>
          </div>
        ) : (
          <div className="playlist-list">
            {playlists.map((pl) => {
              const isCurrent = player?.playlistId === pl.id;
              return (
                <div key={pl.id} className={`playlist-card${isCurrent ? " active" : ""}`}>
                  <div className="playlist-head">
                    <span className="playlist-name">🎧 {pl.name}</span>
                    <button
                      type="button"
                      className="playlist-del"
                      onClick={() => removePlaylist(pl.id)}
                      title="删除歌单"
                    >
                      ✕
                    </button>
                  </div>
                  {(pl.tracks || []).length === 0 ? (
                    <p className="muted playlist-empty">这个歌单还没有歌。</p>
                  ) : (
                    <ul className="playlist-tracks">
                      {(pl.tracks || []).map((t, i) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            className={`track-row${
                              isCurrent && currentTrack?.id === t.id ? " playing" : ""
                            }`}
                            onClick={() => playTrack(pl.id, i)}
                          >
                            <span className="track-idx">
                              {isCurrent && currentTrack?.id === t.id ? "▶" : i + 1}
                            </span>
                            <span className="track-title">{t.title}</span>
                            <span className="track-src">
                              {t.src ? "已就绪" : "无音源"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!hasTracks && (
          <p className="muted music-note">
            音频文件放哪里？可以放到 <code>frontend/public/assets/music/</code>，然后在{" "}
            <code>frontend/src/pages/Music.jsx</code> 的歌单数据里给曲目填上{" "}
            <code>src</code> 地址。不放假音乐，先保持空状态。
          </p>
        )}
      </section>

      {/* 隐藏的 audio 元素，真正有音源时用于播放 */}
      <audio ref={audioRef} />
    </div>
  );
}
