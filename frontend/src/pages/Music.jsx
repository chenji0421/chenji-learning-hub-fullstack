import { useEffect, useRef, useState } from "react";
import { musicLibrary } from "../data/music.js";

// 个人音乐台：把喜欢的歌放进站点里，打开网页就能听。
// - 站内音乐库：frontend/src/data/music.js 登记 frontend/public/music/ 下的真实音频文件
// - 用户歌单：存 localStorage（前端状态），不接后端，不影响文章/计划/登录
// - 没有真实音频文件 → 显示空状态，不放假歌曲
// - 站内音乐与用户歌单共用同一套播放逻辑，通过 music:changed 事件同步迷你播放器
const PLAYLISTS_KEY = "chl_music_playlists";
const PLAYER_KEY = "chl_music_player";

const PLAYLIST_MODES = [
  { key: "list", label: "列表循环", icon: "🔁" },
  { key: "one", label: "单曲循环", icon: "🔂" },
  { key: "shuffle", label: "随机播放", icon: "🔀" },
];

// 浏览器对音频格式的支持情况：flac 等格式兼容性不如 mp3，
// 不支持时页面给出友好提示（建议转 mp3）。
const AUDIO_FORMATS = (() => {
  const a = typeof Audio !== "undefined" ? new Audio() : null;
  const can = (mime) =>
    a && typeof a.canPlayType === "function" ? !!a.canPlayType(mime).replace(/no/, "") : false;
  return { flac: can("audio/flac"), mp3: can("audio/mpeg"), ogg: can("audio/ogg"), wav: can("audio/wav") };
})();

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

  // 站内音乐库作为内置歌单（不可删除），与用户自建歌单一起展示
  const libraryPlaylist = musicLibrary.length
    ? { id: "builtin-library", name: "站内音乐", tracks: musicLibrary, builtin: true }
    : null;
  const allPlaylists = libraryPlaylist ? [libraryPlaylist, ...playlists] : playlists;

  // 持久化用户歌单 / 播放状态，播放状态变化时通知迷你播放器同步
  useEffect(() => {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  }, [playlists]);
  // 迷你播放器读的是同一把 localStorage 钥匙，但需要带上歌名才能显示，
  // 否则底部播放器永远只会显示「暂无音乐」
  useEffect(() => {
    const stored = (() => {
      if (!player) return null;
      const pl = allPlaylists.find((p) => p.id === player.playlistId);
      const track = pl && (pl.tracks || [])[player.index];
      return track ? { ...player, title: track.title, src: track.src } : player;
    })();
    localStorage.setItem(PLAYER_KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event("music:changed"));
  }, [player, playlists]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当前播放的曲目
  const currentTrack = (() => {
    if (!player) return null;
    const pl = allPlaylists.find((p) => p.id === player.playlistId);
    if (!pl) return null;
    return pl.tracks[player.index] || null;
  })();

  // 有没有任何一首真实音轨
  const hasTracks = allPlaylists.some((p) => (p.tracks || []).length > 0);

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
    const flat = allPlaylists.flatMap((p) =>
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
      index: allPlaylists
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
          <p className="page-sub">这里可以放我自己有权使用的音乐、练习音频、环境音或跑步歌单。</p>
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
                ? <>
                    {player?.playing ? "正在播放" : "已暂停"}
                    {currentTrack.src.toLowerCase().endsWith(".flac") && !AUDIO_FORMATS.flac && (
                      <span className="muted">
                        {" "}
                        · 当前浏览器不支持 flac，建议转成 mp3 后替换文件
                      </span>
                    )}
                  </>
                : "这条曲目还没有音源文件，播放为占位状态"
              : "在下方歌单选择一首歌后，这里会显示正在播放的内容"}
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

        {allPlaylists.length === 0 ? (
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
            {allPlaylists.map((pl) => {
              const isCurrent = player?.playlistId === pl.id;
              return (
                <div key={pl.id} className={`playlist-card${isCurrent ? " active" : ""}`}>
                  <div className="playlist-head">
                    <span className="playlist-name">🎧 {pl.name}</span>
                    {!pl.builtin && (
                      <button
                        type="button"
                        className="playlist-del"
                        onClick={() => removePlaylist(pl.id)}
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
            如何添加音乐：把音频文件放到 <code>frontend/public/music/</code>，
            然后在 <code>frontend/src/data/music.js</code> 里添加 title、artist、src，
            运行 <code>npm run build</code> 检查，commit + push 后自动部署。
            支持 mp3 / wav / ogg / flac，只放自己有权的音乐（原创 / 授权 / 免费可商用），不放版权歌曲。
          </p>
        )}
      </section>

      {/* 隐藏的 audio 元素，真正有音源时用于播放 */}
      <audio ref={audioRef} />
    </div>
  );
}
