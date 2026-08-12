// 关于我：内容全部来自后端 /api/about-profile（管理员在后台编辑）。
// 不再写死在 profile.js。加载失败显示友好空状态，不白屏。
import { useEffect, useState } from "react";
import { api } from "../api.js";

// 基本信息行从后端字段拼出来（名字 / 学校 / 年级 / 阶段 / 兴趣 / 当前状态）
function buildBasic(profile) {
  return [
    { label: "名字", value: profile.name },
    { label: "学校", value: profile.school },
    { label: "年级", value: profile.grade },
    { label: "阶段", value: profile.stage },
    { label: "兴趣", value: profile.interests },
    { label: "当前状态", value: profile.current_status },
  ].filter((row) => row.value);
}

export default function About() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | empty | error

  useEffect(() => {
    api
      .getAboutProfile()
      .then((data) => {
        setProfile(data);
        // 有标题或名字就算有内容；否则按空状态处理
        setStatus(data && (data.title || data.name) ? "ok" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div className="about page">
        <div className="loading">正在加载关于我…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="about page">
        <div className="empty-state">
          <div className="empty-icon">🙋</div>
          <h2>关于我加载失败</h2>
          <p>暂时没能从服务器取到内容，请稍后再试。</p>
        </div>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="about page">
        <section className="wb-card">
          <h2>🙋 关于我</h2>
          <p className="muted">关于我内容还没有公开，请稍后再来看看。</p>
        </section>
      </div>
    );
  }

  const hobbies = profile.hobby_cards || [];
  const learning = profile.learning_items || [];
  const goals = profile.goal_items || [];
  const basic = buildBasic(profile);

  return (
    <div className="about page">
      {/* 顶部 Hero：About Me + 欢迎语 + 一句话介绍 */}
      <section className="hero about-hero">
        <div className="about-hero-avatar" aria-hidden="true">
          沉
        </div>
        <div className="about-hero-body">
          <span className="about-kicker">{profile.kicker || "About Me"}</span>
          <h1>{profile.title || "你好，我是沉积"}</h1>
          <p className="about-hero-sub">{profile.subtitle || ""}</p>
          <p className="about-hero-desc">{profile.description || ""}</p>
        </div>
      </section>

      {/* 基本信息 */}
      {basic.length > 0 && (
        <section className="wb-card">
          <h2>🙋 基本信息</h2>
          <ul className="about-list">
            {basic.map((item) => (
              <li key={item.label}>
                <span className="ops-label">{item.label}</span>
                <span>{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 兴趣与习惯 */}
      {hobbies.length > 0 && (
        <section className="wb-card">
          <h2>🎯 兴趣与习惯</h2>
          <div className="stat-cards stat-cards-sm">
            {hobbies.map((h, i) => (
              <div className="stat-card" key={h.title || i}>
                <div className="stat-num">{h.icon || "✦"}</div>
                <div className="stat-label">{h.title}</div>
                {h.desc && <p className="stat-hint">{h.desc}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 正在学习 */}
      {learning.length > 0 && (
        <section className="wb-card">
          <h2>📚 正在学习</h2>
          <div className="skill-cards">
            {learning.map((s, i) => (
              <div className="skill-card" key={s.name || i}>
                <div className="skill-name">{s.name}</div>
                {s.desc && <p className="skill-desc">{s.desc}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 这个网站是什么 */}
      {profile.site_desc && (
        <section className="wb-card">
          <h2>💻 这个网站是什么</h2>
          <p className="about-desc">{profile.site_desc}</p>
        </section>
      )}

      {/* 目前想做的事 */}
      {goals.length > 0 && (
        <section className="wb-card">
          <h2>🌱 目前想做的事</h2>
          <ul className="about-goals">
            {goals.map((goal, i) => (
              <li key={goal || i}>{goal}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
