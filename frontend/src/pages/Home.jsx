import { useEffect, useState } from "react";
import { api } from "../api.js";
import { changelog } from "../data/changelog.js";
import { SITE_INFO } from "../data/site.js";

// 上线时长：以站点上线日期（SITE_INFO.launchedAt）为起点，实时计算 X 天 Y 小时 Z 分 W 秒。
// 起点无效时返回 null（页面显示「上线时间待确认」）；Math.max(0, …) 防止出现负数。
function computeUptime(launchedAt, now) {
  const start = new Date(launchedAt);
  if (Number.isNaN(start.getTime())) return null;
  const totalSec = Math.floor(Math.max(0, now.getTime() - start.getTime()) / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d} 天 ${h} 小时 ${m} 分 ${s} 秒`;
}

export default function Home({ user }) {
  const [articles, setArticles] = useState(null);
  const [plans, setPlans] = useState(null);
  const [health, setHealth] = useState(null);
  const [notes, setNotes] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // 时钟卡片：每秒刷新
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // 每个接口单独容错：失败返回 null，只影响对应卡片，不影响页面渲染
    Promise.all([
      api.listArticles().catch(() => null),
      api.listPlans().catch(() => null),
      api.health().catch(() => null),
      api.listNoteItems().catch(() => null),
    ])
      .then(([a, p, h, n]) => {
        setArticles(Array.isArray(a) ? a : null);
        setPlans(Array.isArray(p) ? p : null);
        setHealth(h);
        setNotes(Array.isArray(n) ? n : null);
      })
      .finally(() => setLoaded(true));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // loading：请求尚未结束；请求结束后，失败的那一项保持 null
  const loading = !loaded;
  const published = (articles || []).filter((a) => a.status === "published");
  const recentArticles = published.slice(0, 3);

  const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const uptime = computeUptime(SITE_INFO.launchedAt, now);
  const latestVersion = changelog[0] || null;

  return (
    <div className="home">
      {/* 深色科技感 Hero：网格背景 + 渐变光晕 + 终端卡片 */}
      <section className="hero-tech">
        <div className="hero-tech-grid" aria-hidden="true" />
        <div className="hero-tech-glow" aria-hidden="true" />
        <div className="hero-tech-body">
          <span className="hero-tech-badge">
            <span className="pulse-dot" />
            当前专注 Web 前端 & Python
          </span>
          <h1>
            你好，我是
            <br />
            沉积
          </h1>
          <p className="hero-tech-sub">一名正在长跑中的长期主义者</p>
          <p className="hero-tech-desc">
            普通大学生，正在努力把「想做的事」变成「会做的事」。从一行代码开始，
            一路把课程笔记、AI 工具、小游戏和运维后台慢慢接到这个小站里。
          </p>

          <div className="hero-terminal">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> boot{" "}
              <span className="terminal-val">personal site online</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> stack{" "}
              <span className="terminal-val">React + FastAPI + Docker</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> auth{" "}
              <span className="terminal-val">GitHub OAuth enabled</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span> mode{" "}
              <span className="terminal-val">learning mode</span>
            </div>
          </div>

          <div className="hero-tech-actions">
            <a className="btn btn-primary" href="#/articles">
              📝 查看文章
            </a>
            <a className="btn btn-ghost" href="#/plans">
              🗓️ 查看计划
            </a>
            {user ? (
              <a className="btn btn-ghost" href="#/admin">
                ⚙️ 管理后台
              </a>
            ) : (
              <a className="btn btn-ghost" href="#/login">
                🔑 登录
              </a>
            )}
          </div>
          <p className="hero-whoami">~/whoami</p>
        </div>
      </section>

      <section className="home-notice" aria-label="站点更新">
        <span className="notice-label">站点更新</span>
        <div>
          <strong>已迁移到 Felix 的新服务器</strong>
          <p>当前站点运行在杭州 ECS 上，后续 push 到 GitHub 后会自动部署到新环境。</p>
        </div>
      </section>

      {/* 此刻 / 站点状态面板：全部来自真实 API 或真实配置，不伪造数字 */}
      <section className="now-panel">
        <div className="now-panel-head">
          <span className="now-panel-icon">🕒</span>
          <div className="now-panel-title">
            <h2>此刻</h2>
            <p>{SITE_INFO.siteName} 正在运行中</p>
          </div>
        </div>

        <div className="now-clock">
          <div className="now-time">{timeStr}</div>
          <div className="now-pills">
            <span className="now-pill">📅 {dateStr}</span>
            <span className="now-pill">🌏 {SITE_INFO.timezone}</span>
          </div>
        </div>

        <div className="now-grid">
          <div className="now-card">
            <span className="now-card-icon">🚀</span>
            <div className="now-card-value">{uptime || "上线时间待确认"}</div>
            <div className="now-card-label">上线时间</div>
            <div className="now-card-note">从站点上线日期开始计算</div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">📄</span>
            <div className="now-card-value">
              {loading ? "…" : (articles === null ? "暂时无法获取" : `${published.length} 篇`)}
            </div>
            <div className="now-card-label">公开文章</div>
            <div className="now-card-note">来自文章接口</div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">📅</span>
            <div className="now-card-value">
              {loading ? "…" : (plans === null ? "暂时无法获取" : `${(plans || []).length} 条`)}
            </div>
            <div className="now-card-label">公开计划</div>
            <div className="now-card-note">来自计划接口</div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">📚</span>
            <div className="now-card-value">
              {loading ? "…" : (notes === null ? "暂未接入统计" : `${notes.length} 份`)}
            </div>
            <div className="now-card-label">学习笔记</div>
            <div className="now-card-note">来自笔记接口</div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">🏷️</span>
            <div className="now-card-value">
              {latestVersion ? latestVersion.version : "暂无版本记录"}
            </div>
            <div className="now-card-label">当前版本</div>
            <div className="now-card-note">
              {latestVersion ? latestVersion.title : "暂无更新记录"}
            </div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">📡</span>
            <div className="now-card-value">
              {health?.status === "ok" ? "运行正常" : "暂不可用"}
            </div>
            <div className="now-card-label">后端服务</div>
            <div className="now-card-note">
              {health?.status === "ok" ? "健康检查通过" : "检查 /api/health"}
            </div>
          </div>

          <div className="now-card">
            <span className="now-card-icon">🔑</span>
            <div className="now-card-value">{user ? user.username : "未登录"}</div>
            <div className="now-card-label">登录状态</div>
            <div className="now-card-note">
              {user ? (user.is_admin ? "管理员" : "访客") : "登录后可管理"}
            </div>
          </div>
        </div>
      </section>

      {/* 当前正在发生什么：全部真实接入状态 */}
      <section className="home-module">
        <h2>📡 当前正在发生什么</h2>
        <div className="whats-on">
          <span className="whats-item on">✅ 文章系统已接入</span>
          <span className="whats-item on">✅ 计划系统已接入</span>
          <span className="whats-item on">✅ GitHub 登录已接入</span>
          <span className="whats-item on">✅ 自动部署已接入</span>
        </div>
      </section>

      {/* 最近更新：读取 changelog 数据，展示最新 3 条 */}
      <section className="home-module">
        <h2>🕘 最近更新</h2>
        {changelog.length === 0 ? (
          <p className="empty-inline">暂无更新记录。</p>
        ) : (
          <>
            <ul className="updates-list">
              {changelog.slice(0, 3).map((u) => (
                <li key={u.version}>
                  <span className="updates-version">{u.version}</span>
                  <span className="updates-date">{u.date}</span>
                  <span className="updates-text">{u.title}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 14 }}>
              <a className="btn btn-sm" href="#/changelog">
                查看全部更新 →
              </a>
            </div>
          </>
        )}
      </section>

      {/* 最近文章：真实数据，没有就显示空引导 */}
      <section className="home-module">
        <h2>📝 最近文章</h2>
        {loading ? (
          <p className="empty-inline">加载中…</p>
        ) : articles === null ? (
          <p className="empty-inline">暂时无法获取文章列表，稍后再来看看吧。</p>
        ) : published.length === 0 ? (
          <p className="empty-inline">
            还没有文章。管理员登录后，在「管理」里写下第一篇吧。
          </p>
        ) : (
          <ul className="article-list" style={{ gap: 10 }}>
            {recentArticles.map((a) => (
              <li key={a.id}>
                <a className="article-card" href={`#/articles/${a.id}`}>
                  <div className="article-card-head">
                    <span className="article-title">{a.title}</span>
                    {a.category && <span className="tag">{a.category}</span>}
                  </div>
                  <span className="article-date">
                    更新于 {new Date(a.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {!loading && published.length > 3 && (
          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href="#/articles">
              查看全部文章 →
            </a>
          </div>
        )}
      </section>

      {/* 认识这里：关于我 / 学习笔记库 / 友人链接 */}
      <section className="home-module">
        <h2>🧭 认识这里</h2>
        <div className="entry-cards">
          <a className="entry-card" href="#/about">
            <span className="entry-card-icon">🙋</span>
            <h3>关于沉积</h3>
            <p>了解沉积是谁、正在学习什么、为什么做这个网站。</p>
          </a>
          <a className="entry-card" href="#/notes">
            <span className="entry-card-icon">📚</span>
            <h3>学习笔记库</h3>
            <p>查看按课程和主题整理的 PDF 学习笔记。</p>
          </a>
          <a className="entry-card" href="#/friends">
            <span className="entry-card-icon">🤝</span>
            <h3>友人链接</h3>
            <p>访问朋友的网站和参考站点。</p>
          </a>
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="home-module">
        <h2>⚡ 快捷入口</h2>
        <div className="home-links">
          <a className="btn" href="#/notes">
            📚 学习笔记
          </a>
          <a className="btn" href="#/toolbox">
            🧰 工具箱
          </a>
          <a className="btn" href="#/game">
            🎮 游戏
          </a>
          <a className="btn" href="#/music">
            🎵 音乐台
          </a>
          {user && user.is_admin && (
            <a className="btn btn-primary" href="#/admin">
              ✍️ 写文章
            </a>
          )}
        </div>
      </section>

      {/* 项目说明 */}
      <section className="home-module">
        <h2>📌 关于本站</h2>
        <p className="empty-inline">
          当前网站部署在 <code>chenji.felixfu.xyz</code>，使用{" "}
          <code>React + FastAPI + Docker + GitHub Actions</code> 构建。
          内容保存在服务器数据库里，不依赖浏览器本地存储。
        </p>
      </section>
    </div>
  );
}
