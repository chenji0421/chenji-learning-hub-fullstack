// 全站全局音乐播放器上下文：
// - audio 元素只在 App 顶层渲染一次，不随页面切换卸载
// - 音乐页、侧边栏迷你播放器共享同一份播放状态
// - 切换页面不重置当前歌曲、播放进度和播放状态
// - 刷新后恢复最近播放歌曲信息和进度，但不强行自动播放（遵守浏览器限制）
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { musicLibrary } from "../data/music.js";

const PLAYER_KEY = "chl_music_player";
const PLAYLISTS_KEY = "chl_music_playlists";
const MODE_KEY = "chl_music_mode";

// 浏览器对音频格式的支持情况：flac 兼容性不如 mp3，不支持时给出友好提示
export const AUDIO_FORMATS = (() => {
  if (typeof Audio === "undefined") {
    return { flac: false, mp3: false, ogg: false, wav: false };
  }
  const a = new Audio();
  const can = (mime) =>
    a && typeof a.canPlayType === "function"
      ? !!a.canPlayType(mime).replace(/no/, "")
      : false;
  return {
    flac: can("audio/flac"),
    mp3: can("audio/mpeg"),
    ogg: can("audio/ogg"),
    wav: can("audio/wav"),
  };
})();

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

// 站内音乐库作为内置歌单，与用户自建歌单合并
function buildPlaylists() {
  const libraryPlaylist = musicLibrary.length
    ? { id: "builtin-library", name: "站内音乐", tracks: musicLibrary, builtin: true }
    : null;
  const user = readJSON(PLAYLISTS_KEY, []);
  return libraryPlaylist ? [libraryPlaylist, ...user] : user;
}

// 展平为统一播放队列，顺序与各歌单内 index 保持一致
function buildQueue(playlists) {
  return playlists.flatMap((p) =>
    (p.tracks || []).map((track) => ({ playlistId: p.id, track }))
  );
}

// 在队列中定位 (playlistId, index)
function indexOfInQueue(queue, playlistId, index) {
  let found = 0;
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].playlistId === playlistId) {
      if (found === index) return i;
      found++;
    }
  }
  return -1;
}

// 反向：队列下标 → 歌单内下标
function indexWithinPlaylist(queue, playlistId, queueIndex) {
  let local = 0;
  for (let i = 0; i < queue.length; i++) {
    if (i === queueIndex) return local;
    if (queue[i].playlistId === playlistId) local++;
  }
  return -1;
}

const MusicPlayerContext = createContext(null);

export function MusicPlayerProvider({ children }) {
  const [playlists, setPlaylists] = useState(() => buildPlaylists());
  const queue = useMemo(() => buildQueue(playlists), [playlists]);

  // 初始化：从 localStorage 恢复最近播放的歌曲（仅恢复信息，不自动播放）
  const savedRef = useRef(null);
  const pendingSeekRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(() => {
    savedRef.current = readJSON(PLAYER_KEY, null);
    pendingSeekRef.current = savedRef.current?.currentTime || 0;
    if (!savedRef.current || savedRef.current.index === undefined) return -1;
    return indexOfInQueue(
      buildQueue(buildPlaylists()),
      savedRef.current.playlistId,
      savedRef.current.index
    );
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => savedRef.current?.volume ?? 0.7);
  const [error, setError] = useState(null);
  const [canPlay, setCanPlay] = useState(false);
  const [mode, setMode] = useState(() => readJSON(MODE_KEY, "list"));

  const audioRef = useRef(null);

  // 最新值 refs：一次性绑定的 audio 事件回调里读取，避免陈旧闭包
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // 持久化播放模式
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const currentItem =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const currentTrack = currentItem?.track || null;
  const currentPlaylistId = currentItem?.playlistId || null;

  // 播放队列中某个索引（可指定是否自动开始播放）
  const playQueueIndex = (idx, autoplay = true) => {
    if (idx < 0 || idx >= queue.length) return;
    setCurrentIndex(idx);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setCanPlay(false);
    setIsPlaying(autoplay);
  };

  // 上一首 / 下一首：列表循环；单曲循环只在播放结束时原地重播；随机播放随机跳
  const nextTrack = () => {
    const q = queueRef.current;
    if (!q.length) return;
    let idx = currentIndexRef.current;
    if (modeRef.current === "shuffle") {
      if (q.length === 1) {
        setCurrentIndex(0);
        setIsPlaying(true);
        return;
      }
      let n = Math.floor(Math.random() * q.length);
      while (n === idx) n = Math.floor(Math.random() * q.length);
      idx = n;
    } else {
      idx = (idx + 1) % q.length;
    }
    playQueueIndex(idx);
  };

  const prevTrack = () => {
    const q = queueRef.current;
    if (!q.length) return;
    let idx = currentIndexRef.current;
    if (modeRef.current === "shuffle") {
      if (q.length === 1) {
        setCurrentIndex(0);
        setIsPlaying(true);
        return;
      }
      let n = Math.floor(Math.random() * q.length);
      while (n === idx) n = Math.floor(Math.random() * q.length);
      idx = n;
    } else {
      idx = (idx - 1 + q.length) % q.length;
    }
    playQueueIndex(idx);
  };

  // 从某个歌单播放第 index 首（音乐页曲目行点击）
  const playTrack = (playlistId, index) => {
    const idx = indexOfInQueue(queue, playlistId, index);
    if (idx < 0) return;
    playQueueIndex(idx);
  };

  // 播放 / 暂停；没有当前歌曲但有可播曲目时直接播第一首
  const togglePlay = () => {
    if (currentIndex < 0) {
      if (queue.length) playQueueIndex(0);
      return;
    }
    setIsPlaying((p) => !p);
  };
  const pause = () => setIsPlaying(false);

  // 跳转进度
  const seek = (time) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time) || time < 0) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  // 调节音量
  const setVolume = (value) => {
    const v = Math.max(0, Math.min(1, value));
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  // 新建歌单（持久化到 localStorage）
  const addPlaylist = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const pl = {
      id: `pl-${Date.now()}`,
      name: trimmed,
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists((ps) => {
      const next = [...ps, pl];
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // 删除歌单；若正在播放该歌单的歌曲则停止播放
  const removePlaylist = (id) => {
    setPlaylists((ps) => {
      const next = ps.filter((p) => p.id !== id);
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next));
      return next;
    });
    if (currentItem?.playlistId === id) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        delete audio.dataset.trackId;
      }
      setCurrentIndex(-1);
      setIsPlaying(false);
      setError(null);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  // 播放结束：单曲循环原地重播，否则自动下一首
  const handleEnded = () => {
    const audio = audioRef.current;
    const q = queueRef.current;
    if (!q.length) return;
    if (modeRef.current === "one") {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => setError("音频加载失败，请检查文件路径或格式。"));
      }
      return;
    }
    let idx = currentIndexRef.current;
    if (modeRef.current === "shuffle") {
      if (q.length === 1) {
        setCurrentIndex(0);
        setIsPlaying(true);
        return;
      }
      let n = Math.floor(Math.random() * q.length);
      while (n === idx) n = Math.floor(Math.random() * q.length);
      idx = n;
    } else {
      idx = (idx + 1) % q.length;
    }
    setCurrentIndex(idx);
    setIsPlaying(true);
  };

  // 一次性绑定 audio 事件（audio 元素只在 App 顶层渲染一次，这里只绑一次）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => {
      if (audio.duration && Number.isFinite(audio.duration)) setDuration(audio.duration);
      // 刷新后恢复最近播放进度
      if (pendingSeekRef.current > 0 && audio.duration) {
        audio.currentTime = Math.min(pendingSeekRef.current, audio.duration);
        pendingSeekRef.current = 0;
      }
    };
    const onEnded = handleEnded;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setError("音频加载失败，请检查文件路径或格式。");
      setCanPlay(false);
    };
    const onCanPlay = () => {
      setCanPlay(true);
      setError(null);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前歌曲 / 播放状态变化 → 设置音源并播放或暂停
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentIndex < 0 || !currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      delete audio.dataset.trackId;
      return;
    }
    if (audio.dataset.trackId !== currentTrack.id) {
      audio.dataset.trackId = currentTrack.id;
      audio.src = currentTrack.src;
      audio.volume = volumeRef.current;
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      setCanPlay(false);
    }
    if (isPlaying) {
      audio.play().catch(() => setError("音频加载失败，请检查文件路径或格式。"));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPlaying]);

  // 音量变化实时生效
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // 持久化当前播放信息（含进度 / 音量 / 歌曲），供刷新后恢复
  useEffect(() => {
    if (currentIndex < 0 || !currentTrack || !currentItem) {
      localStorage.removeItem(PLAYER_KEY);
      return;
    }
    const localIndex = indexWithinPlaylist(queue, currentItem.playlistId, currentIndex);
    localStorage.setItem(
      PLAYER_KEY,
      JSON.stringify({
        playlistId: currentItem.playlistId,
        index: localIndex,
        playing: isPlaying,
        currentTime,
        volume,
        title: currentTrack.title,
        src: currentTrack.src,
        lastUpdated: Date.now(),
      })
    );
  }, [currentIndex, currentTime, isPlaying, volume, queue, currentTrack, currentItem]);

  const value = {
    playlists,
    queue,
    currentTrack,
    currentPlaylistId,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    error,
    canPlay,
    mode,
    setMode,
    flacSupported: AUDIO_FORMATS.flac,
    playTrack,
    togglePlay,
    pause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    addPlaylist,
    removePlaylist,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      {/* 全站唯一的 audio 元素：挂在 App 顶层，不随页面切换卸载 */}
      <audio ref={audioRef} preload="metadata" />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer 必须在 MusicPlayerProvider 内部使用");
  return ctx;
}
