// 关于我：沉积的真实自我介绍。
// 只写确认过的信息，不编造学院、专业、获奖、奖项、论文、比赛等经历。
import { PROFILE } from "../data/profile.js";

export default function About() {
  return (
    <div className="about page">
      {/* 顶部 Hero：About Me + 欢迎语 + 一句话介绍 */}
      <section className="hero about-hero">
        <div className="about-hero-avatar" aria-hidden="true">
          沉
        </div>
        <div className="about-hero-body">
          <span className="about-kicker">{PROFILE.hero.kicker}</span>
          <h1>{PROFILE.hero.title}</h1>
          <p className="about-hero-sub">{PROFILE.hero.subtitle}</p>
          <p className="about-hero-desc">{PROFILE.hero.description}</p>
        </div>
      </section>

      {/* 基本信息 */}
      <section className="wb-card">
        <h2>🙋 基本信息</h2>
        <ul className="about-list">
          {PROFILE.basic.map((item) => (
            <li key={item.label}>
              <span className="ops-label">{item.label}</span>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 兴趣与习惯 */}
      <section className="wb-card">
        <h2>🎯 兴趣与习惯</h2>
        <div className="stat-cards stat-cards-sm">
          {PROFILE.hobbies.map((h) => (
            <div className="stat-card" key={h.title}>
              <div className="stat-num">{h.icon}</div>
              <div className="stat-label">{h.title}</div>
              <p className="stat-hint">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 正在学习 */}
      <section className="wb-card">
        <h2>📚 正在学习</h2>
        <div className="skill-cards">
          {PROFILE.learning.map((s) => (
            <div className="skill-card" key={s.name}>
              <div className="skill-name">{s.name}</div>
              <p className="skill-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 这个网站是什么 */}
      <section className="wb-card">
        <h2>💻 这个网站是什么</h2>
        <p className="about-desc">{PROFILE.siteDesc}</p>
      </section>

      {/* 目前想做的事 */}
      <section className="wb-card">
        <h2>🌱 目前想做的事</h2>
        <ul className="about-goals">
          {PROFILE.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
