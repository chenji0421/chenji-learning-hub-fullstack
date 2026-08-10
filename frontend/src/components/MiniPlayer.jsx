import { useEffect, useState } from "react";

// 迷你音乐播放器：固定在侧边栏底部。
// 音乐数据存 localStorage（chl_music_player），Music 页播放时通过 music:changed 事件同步。
// 没有真实音乐时显示「暂无音乐」，不放假歌曲。
const PLAYER_KEY = "chl_music_player";

export default function MiniPlayer() {
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const t = JSON.parse(localStorage.getItem(PLAYER_KEY)) || null;
        setTrack(t);
        setPlaying(!!t?.playing);
      } catch {
        setTrack(null);
        setPlaying(false);
      }
    };
    load();
    window.addEventListener("music:changed", load);
    return () => window.removeEventListener("music:changed", load);
  }, []);

  const hasTrack = track && track.title;

  return (
    <a className="mini-player" href="#/music" title="个人音乐台">
      <span className="mini-player-icon">
        {hasTrack && track.playing ? (
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
        <span className="mini-player-title">{hasTrack ? track.title : "暂无音乐"}</span>
        <span className="mini-player-sub">
          {hasTrack ? (track.playing ? "正在播放" : "已暂停") : "前往音乐台添加"}
        </span>
      </span>
      <span className="mini-player-go">{playing ? "▶" : "♪"}</span>
    </a>
  );
}
