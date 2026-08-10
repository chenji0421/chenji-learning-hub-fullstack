// 关于我：沉积的真实自我介绍。
// 只写确认过的信息，不编造学院、专业、获奖、项目经历等。
export default function About() {
  return (
    <div className="about page">
      <div className="changelog-head">
        <h1 className="page-title">关于沉积</h1>
        <p className="page-sub">慢慢认识一下这个网站的主人</p>
      </div>

      {/* 基本信息 */}
      <section className="wb-card">
        <h2>🙋 基本信息</h2>
        <ul className="about-list">
          <li>
            <span className="ops-label">名字</span>
            <span>沉积</span>
          </li>
          <li>
            <span className="ops-label">身份</span>
            <span>浙江大学 2025 级本科生，准大二</span>
          </li>
          <li>
            <span className="ops-label">方向</span>
            <span>正在探索 Python、前端开发、FastAPI 和数据分析</span>
          </li>
        </ul>
      </section>

      {/* 我正在学习 */}
      <section className="wb-card">
        <h2>📚 我正在持续学习</h2>
        <div className="friends-tags">
          {["Python", "前端开发", "FastAPI", "数据分析", "AI 工具使用", "项目部署和运维"].map(
            (t) => (
              <span key={t} className="tag">
                {t}
              </span>
            )
          )}
        </div>
      </section>

      {/* 我的兴趣 */}
      <section className="wb-card">
        <h2>🎯 我的兴趣</h2>
        <div className="stat-cards stat-cards-sm">
          <div className="stat-card">
            <div className="stat-num">🏃</div>
            <div className="stat-label">长跑</div>
            <p className="stat-hint">喜欢用长跑保持节奏和耐心</p>
          </div>
          <div className="stat-card">
            <div className="stat-num">🎨</div>
            <div className="stat-label">画画</div>
            <p className="stat-hint">喜欢用画画记录观察和想法</p>
          </div>
          <div className="stat-card">
            <div className="stat-num">🧩</div>
            <div className="stat-label">建站</div>
            <p className="stat-hint">把学习过程慢慢沉淀到这个网站里</p>
          </div>
        </div>
      </section>

      {/* 这个网站是做什么的 */}
      <section className="wb-card">
        <h2>💻 这个网站是做什么的</h2>
        <p className="about-desc">
          沉积 Learning Hub 是我的个人学习工作台，用来记录学习笔记、文章、计划、项目、工具和成长轨迹。
        </p>
      </section>
    </div>
  );
}
