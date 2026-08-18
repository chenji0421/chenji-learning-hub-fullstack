import { useEffect, useState } from "react";
import { api, getToken } from "../api.js";
import renderMarkdown from "../markdown.jsx";
import { changelog } from "../data/changelog.js";
import NotesAdmin from "../components/NotesAdmin.jsx";
import AboutProfileAdmin from "../components/AboutProfileAdmin.jsx";
import SprintTimeBlocks from "../components/sprint/SprintTimeBlocks.jsx";
import SprintCompletions from "../components/sprint/SprintCompletions.jsx";
import SprintSleep from "../components/sprint/SprintSleep.jsx";

// tags 在表单里用逗号分隔的字符串编辑，提交时拆成数组
const EMPTY_ARTICLE = {
  title: "",
  category: "",
  summary: "",
  content: "",
  tagsInput: "",
  status: "draft",
};
const EMPTY_PLAN = {
  date: "",
  title: "",
  goal: "",
  morning: "",
  afternoon: "",
  evening: "",
  review: "",
  status: "进行中",
};

// 计划月历用的小工具（与 Plans.jsx 保持一致的配色约定）
const STATUS_CLASS = { 未开始: "todo", 进行中: "pending", 已完成: "done", 暂停: "paused" };
const STATUS_ORDER = ["未开始", "进行中", "已完成", "暂停"];
// 后端状态值可能是中文也可能是英文，统一映射成中文显示（todo/doing/done/paused 兼容）
const STATUS_LABEL = {
  未开始: "未开始",
  进行中: "进行中",
  已完成: "已完成",
  暂停: "暂停",
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
  paused: "暂停",
};
// 状态兼容映射：显示用中文标签，样式用固定 class
const toStatusLabel = (s) => STATUS_LABEL[s] || s || "未开始";
const toStatusClass = (s) => STATUS_CLASS[toStatusLabel(s)] || "pending";
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const pad = (n) => String(n).padStart(2, "0");

const EMPTY_RESOURCE = { status: "loading", count: null };
const countResult = (data) => ({
  status: "success",
  count: Array.isArray(data) ? data.length : null,
});

// 后台标签页：系统概览 / 写文章 / 内容库 / 计划管理 / 运维状态
const ADMIN_TABS = [
  { key: "overview", icon: "📊", label: "系统概览" },
  { key: "editor", icon: "✍️", label: "写文章" },
  { key: "library", icon: "🗃️", label: "内容库" },
  { key: "notes", icon: "📚", label: "学习笔记" },
  { key: "plans", icon: "🗓️", label: "计划管理" },
  { key: "sprint", icon: "🚀", label: "阶段计划" },
  { key: "about", icon: "🙋", label: "关于我" },
  { key: "ops", icon: "🛠️", label: "运维状态" },
];

export default function Admin({ user }) {
  const [tab, setTab] = useState("overview");
  const [articles, setArticles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [message, setMessage] = useState(null);
  // 内容库：文章状态筛选
  const [articleFilter, setArticleFilter] = useState("all");
  // 阶段计划管理：二级 tab（时间安排 / 完成度 / 睡眠 / 其他）
  const [sprintSubTab, setSprintSubTab] = useState("time");
  // 计划月历：当前展示的月份 + 选中的日期（默认今天）
  const [planMonth, setPlanMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  // 运维状态：后端健康检查
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState({
    articles: EMPTY_RESOURCE,
    plans: EMPTY_RESOURCE,
    notes: EMPTY_RESOURCE,
    weights: EMPTY_RESOURCE,
    exercises: EMPTY_RESOURCE,
    sleep: EMPTY_RESOURCE,
    diet: EMPTY_RESOURCE,
  });

  const setOverviewStat = (key, value) => {
    setOverviewStats((current) => ({ ...current, [key]: value }));
  };

  const loadOverviewResource = async (key, loader, onSuccess) => {
    setOverviewStat(key, EMPTY_RESOURCE);
    try {
      const data = await loader();
      if (onSuccess) onSuccess(data);
      setOverviewStat(key, countResult(data));
    } catch {
      setOverviewStat(key, { status: "error", count: null });
    }
  };

  const refresh = () => {
    loadOverviewResource("articles", api.listArticles, setArticles);
    loadOverviewResource("plans", api.listPlans, setPlans);
  };

  const loadOverviewStats = () => {
    loadOverviewResource("notes", api.listNoteItems);
    loadOverviewResource("weights", api.listBodyWeights);
    loadOverviewResource("exercises", api.listExercises);
    loadOverviewResource("sleep", api.listSleepRecords);
    loadOverviewResource("diet", api.listDietRecords);
  };

  // ---------- 运维状态 ----------
  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const data = await api.health();
      setHealth({ ok: true, data });
    } catch (e) {
      setHealth({ ok: false, error: e.message });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    loadOverviewStats();
    runHealthCheck();
  }, []);

  if (!getToken()) {
    return (
      <div className="empty-state">
        <h2>请先使用 GitHub 登录</h2>
        <p>登录后才能进入管理后台，并管理文章和计划。</p>
        <a className="btn btn-primary" href="#/login">
          前往 GitHub 登录
        </a>
      </div>
    );
  }

  if (!user) {
    return <div className="loading">正在获取登录状态…</div>;
  }

  if (!user.is_admin) {
    return (
      <div className="empty-state">
        <h2>没有管理权限</h2>
        <p>
          只有 GitHub 用户名为 <code>chenji0421</code> 的管理员可以管理内容。
        </p>
      </div>
    );
  }

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    // 错误提示多停留一会，方便用户看清失败原因
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const cancelEdit = () => {
    setEditingArticle(null);
    setEditingPlan(null);
    setArticleForm(EMPTY_ARTICLE);
    setPlanForm(EMPTY_PLAN);
  };

  // 仅清空计划表单（不碰文章表单）
  const clearPlanForm = () => {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
  };

  const startNewArticle = () => {
    cancelEdit();
    setTab("editor");
  };

  // ---------- 文章操作 ----------
  const submitArticle = async (status) => {
    if (!articleForm.title.trim()) {
      showMsg("标题不能为空", "error");
      return;
    }
    const payload = {
      title: articleForm.title,
      category: articleForm.category,
      summary: articleForm.summary,
      content: articleForm.content,
      tags: articleForm.tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status,
    };
    try {
      if (editingArticle) {
        await api.updateArticle(editingArticle.id, payload);
      } else {
        await api.createArticle(payload);
      }
      showMsg(status === "published" ? "文章已发布" : "文章已保存为草稿");
      setArticleForm(EMPTY_ARTICLE);
      setEditingArticle(null);
      refresh();
      setTab("library");
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const editArticle = (a) => {
    setEditingArticle(a);
    setEditingPlan(null);
    setArticleForm({
      title: a.title,
      category: a.category,
      summary: a.summary,
      content: a.content,
      tagsInput: (a.tags || []).join(", "),
      status: a.status,
    });
    setTab("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublish = async (a) => {
    const next = a.status === "published" ? "draft" : "published";
    try {
      await api.updateArticle(a.id, { status: next });
      showMsg(next === "published" ? "文章已发布" : "文章已转为草稿");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const deleteArticle = async (id) => {
    if (!window.confirm("确定删除这篇文章？此操作不可撤销。")) return;
    try {
      await api.deleteArticle(id);
      showMsg("文章已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // ---------- 计划操作 ----------
  const submitPlan = async (e) => {
    e.preventDefault();
    if (!planForm.date || !planForm.title.trim()) {
      showMsg("日期和标题不能为空", "error");
      return;
    }
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.date, planForm);
        showMsg("计划已更新");
      } else {
        await api.createPlan(planForm);
        showMsg("计划已创建");
      }
      setPlanForm(EMPTY_PLAN);
      setEditingPlan(null);
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const editPlan = (p) => {
    setEditingPlan(p);
    setEditingArticle(null);
    setPlanForm({
      date: p.date,
      title: p.title,
      goal: p.goal,
      morning: p.morning,
      afternoon: p.afternoon,
      evening: p.evening,
      review: p.review,
      status: toStatusLabel(p.status),
    });
    setTab("plans");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePlan = async (date) => {
    if (!window.confirm("确定删除这条计划？此操作不可撤销。")) return;
    try {
      await api.deletePlan(date);
      showMsg("计划已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // 从月历点击「新建当天计划」：把表单日期预填成选中的那一天
  const newPlanForDate = (date) => {
    setEditingArticle(null);
    setEditingPlan(null);
    setPlanForm({ ...EMPTY_PLAN, date });
    setTab("plans");
    // 等 plans 标签页渲染出来再滚动到表单
    setTimeout(() => {
      document.getElementById("admin-plan-form")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  // ---------- 统计与计划月历 ----------
  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.length - publishedCount;

  // 计划完成度：真实统计（状态映射与 Plans.jsx 一致，不使用假数据）
  const planCounts = { 未开始: 0, 进行中: 0, 已完成: 0, 暂停: 0 };
  for (const p of plans) {
    const label = toStatusLabel(p.status);
    if (label in planCounts) planCounts[label] += 1;
  }
  const planDone = planCounts["已完成"];
  const planDoing = planCounts["进行中"];
  const planRate = plans.length > 0 ? Math.round((planDone / plans.length) * 100) : 0;

  const byDate = {};
  for (const p of plans) byDate[p.date] = p;
  const [year, month] = planMonth.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${planMonth}-${pad(d)}`;
    cells.push({ key, day: d, plan: byDate[key] || null });
  }
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  const dayPlan = byDate[selectedDate] || null;

  const filteredArticles =
    articleFilter === "all"
      ? articles
      : articles.filter((a) => a.status === articleFilter);

  const latestChange = changelog[0];
  const recentChanges = changelog.slice(0, 3);
  const overviewCount = (key) => {
    const item = overviewStats[key];
    if (item.status === "loading") return "加载中";
    if (item.status === "error") return "暂时无法获取";
    if (typeof item.count !== "number") return "暂未接入统计";
    return item.count;
  };

  return (
    <div className="admin workbench">
      <div className="wb-head">
        <div>
          <h1>管理后台</h1>
          <div className="who">
            <img src={user.avatar_url} alt="" width="26" height="26" className="avatar" />
            <span>{user.username}</span>
            <span className="role-badge">管理员</span>
          </div>
        </div>
        {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      </div>

      {/* 后台标签页导航 */}
      <div className="admin-tabs">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`admin-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="admin-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ 总览 ============ */}
      {tab === "overview" && (
        <div className="overview-dashboard">
          <section className="overview-welcome">
            <div>
              <span className="overview-eyebrow">SYSTEM OVERVIEW</span>
              <h2>后台控制台</h2>
              <p>管理沉积 Learning Hub 的内容、计划、笔记和站点状态。</p>
            </div>
            <div className="overview-meta">
              <span>当前用户<strong>{user.username}</strong></span>
              <span>当前角色<strong>{user.username === "chenji0421" ? "管理员" : "普通用户"}</strong></span>
              <span>当前版本<strong>{latestChange?.version || "暂未记录"}</strong></span>
              <span>最近更新<strong>{latestChange ? `${latestChange.title} · ${latestChange.date}` : "暂未记录"}</strong></span>
            </div>
          </section>

          <section className="overview-section">
            <div className="overview-section-head"><div><h2>站点健康状态</h2><p>各状态独立获取，单项异常不会影响控制台。</p></div></div>
            <div className="overview-health-grid">
              <article className="overview-mini-card"><span>后端状态</span><strong>{healthLoading ? "检查中" : health ? (health.ok ? "正常" : "异常") : "暂时无法获取"}</strong></article>
              <article className="overview-mini-card"><span>前端状态</span><strong>已加载</strong></article>
              <article className="overview-mini-card"><span>数据状态</span><strong>{healthLoading ? "检查中" : health?.ok ? "通过后端接口读取" : "暂时无法获取"}</strong></article>
            </div>
          </section>

          <section className="overview-section">
            <div className="overview-section-head"><div><h2>内容统计</h2><p>数量仅来自现有真实 API。</p></div></div>
            <div className="overview-stats-grid">
              {[
                ["articles", "文章数量", "📝"], ["plans", "计划数量", "🗓️"],
                ["notes", "学习笔记数量", "📚"], ["weights", "体重记录数量", "⚖️"],
                ["exercises", "运动记录数量", "🏃"], ["sleep", "睡眠记录数量", "🌙"],
                ["diet", "饮食记录数量", "🍽️"],
              ].map(([key, label, icon]) => (
                <article className={`overview-stat-card is-${overviewStats[key].status}`} key={key}>
                  <span className="overview-stat-icon">{icon}</span>
                  <span>{label}</span>
                  <strong>{overviewCount(key)}</strong>
                </article>
              ))}
            </div>
          </section>

          <div className="overview-columns">
            <section className="overview-section">
              <div className="overview-section-head"><div><h2>最近更新</h2><p>最新 3 条真实版本记录。</p></div><a className="btn btn-sm" href="#/changelog">查看完整更新日志</a></div>
              <div className="overview-updates">
                {recentChanges.map((item) => <article key={item.version}><div><span className="changelog-version">{item.version}</span><span className="badge">{item.type}</span></div><h3>{item.title}</h3><time>{item.date}</time></article>)}
              </div>
            </section>

            <section className="overview-section">
              <div className="overview-section-head"><div><h2>快捷管理入口</h2><p>前往已有后台标签或前台页面。</p></div></div>
              <div className="overview-actions">
                <button onClick={startNewArticle}>✍️ 写文章</button><button onClick={() => setTab("library")}>🗃️ 文章管理</button>
                <button onClick={() => setTab("plans")}>🗓️ 计划管理</button><button onClick={() => setTab("notes")}>📚 学习笔记管理</button>
                <button onClick={() => setTab("about")}>🙋 关于我管理</button><a href="#/plans">查看计划页</a>
                <a href="#/notes">查看学习笔记</a><a href="#/">查看网站首页</a><a href="#/changelog">查看更新日志</a>
              </div>
            </section>
          </div>

          <section className="overview-reminder">
            <h2>维护提醒</h2>
            <ul><li>每次明显修改后同步更新 CHANGELOG.md 和 changelog.js</li><li>不提交 .env、数据库、上传文件和密钥</li><li>大改后端前先本地验证，再上线</li><li>没有真实数据时显示空状态，不写假数字</li></ul>
          </section>
        </div>
      )}

      {/* ============ 写文章 ============ */}
      {tab === "editor" && (
        <section className="wb-card">
          <h2>{editingArticle ? "✍️ 编辑文章" : "✍️ 写新文章"}</h2>
          <div className="editor-layout">
            <div className="editor-main">
              <div className="form-group">
                <label>标题</label>
                <input
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>分类</label>
                  <input
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                    placeholder="如：技术笔记 / 随笔"
                  />
                  <span className="label-hint">填「技术笔记」会出现在技术笔记中心</span>
                </div>
                <div className="form-group">
                  <label>标签（逗号分隔）</label>
                  <input
                    value={articleForm.tagsInput}
                    onChange={(e) => setArticleForm({ ...articleForm, tagsInput: e.target.value })}
                    placeholder="Python, FastAPI"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>摘要</label>
                <input
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>正文（Markdown：支持 # 标题、- 列表、{">"} 引用、代码块、加粗、行内代码、链接）</label>
                <textarea
                  rows="14"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => submitArticle("published")}
                >
                  {editingArticle ? "更新并发布" : "发布"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => submitArticle("draft")}
                >
                  {editingArticle ? "保存为草稿" : "保存草稿"}
                </button>
                {(editingArticle || editingPlan) && (
                  <button type="button" className="btn" onClick={cancelEdit}>
                    取消编辑
                  </button>
                )}
              </div>
            </div>
            <div className="editor-preview">
              <h3>实时预览</h3>
              {articleForm.content.trim() ? (
                <div className="article-body">{renderMarkdown(articleForm.content)}</div>
              ) : (
                <p className="empty-preview">在左侧输入正文，这里会实时渲染效果。</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ 内容库 ============ */}
      {tab === "library" && (
        <section className="wb-card">
          <div className="library-head">
            <h2>🗃️ 内容库（{articles.length}）</h2>
            <button className="btn btn-primary btn-sm" onClick={startNewArticle}>
              + 新文章
            </button>
          </div>

          <div className="filter-bar">
            {[
              { key: "all", label: `全部（${articles.length}）` },
              { key: "published", label: `已发布（${publishedCount}）` },
              { key: "draft", label: `草稿（${draftCount}）` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                className={`filter-chip${articleFilter === f.key ? " active" : ""}`}
                onClick={() => setArticleFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <p className="muted">这个分类下还没有文章。</p>
          ) : (
            <ul className="admin-list">
              {filteredArticles.map((a) => (
                <li key={a.id}>
                  <span className="admin-item">
                    {a.status === "published" ? (
                      <span className="badge badge-pub">已发布</span>
                    ) : (
                      <span className="badge badge-draft">草稿</span>
                    )}
                    <span className="admin-item-title">{a.title}</span>
                    {a.category && <span className="muted">· {a.category}</span>}
                  </span>
                  <span className="admin-actions">
                    <button onClick={() => togglePublish(a)}>
                      {a.status === "published" ? "转草稿" : "发布"}
                    </button>
                    <button onClick={() => editArticle(a)}>编辑</button>
                    <button className="danger" onClick={() => deleteArticle(a.id)}>
                      删除
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ============ 计划管理 ============ */}
      {tab === "plans" && (
        <section className="wb-card">
          <h2>🗓️ 计划管理</h2>
          <div className="plans-module-body">
            <div className="plan-calendar">
              <div className="nav-bar">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPlanMonth(prevMonth)}
                >
                  ◀ 上月
                </button>
                <span className="nav-label">
                  {year} 年 {month} 月
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPlanMonth(nextMonth)}
                >
                  下月 ▶
                </button>
              </div>
              <div className="cal-grid">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="cal-head">
                    {w}
                  </div>
                ))}
                {cells.map((c, i) =>
                  c === null ? (
                    <div key={`e${i}`} className="cal-cell empty" />
                  ) : (
                    <button
                      key={c.key}
                      type="button"
                      className={`cal-cell ${c.plan ? "has-plan" : ""} ${
                        selectedDate === c.key ? "selected" : ""
                      }`}
                      onClick={() => setSelectedDate(c.key)}
                    >
                      <span className="cal-day">{c.day}</span>
                      {c.plan && <span className="cal-title">{c.plan.title}</span>}
                    </button>
                  )
                )}
              </div>
              <div className="day-panel">
                {dayPlan ? (
                  <>
                    <p>
                      <b>{selectedDate}</b> · {dayPlan.title}
                      <span className={`status ${toStatusClass(dayPlan.status)}`}>
                        {toStatusLabel(dayPlan.status)}
                      </span>
                    </p>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => editPlan(dayPlan)}
                      >
                        编辑这条计划
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => deletePlan(selectedDate)}
                      >
                        删除
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="muted">{selectedDate} 这一天还没有计划。</p>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => newPlanForDate(selectedDate)}
                      >
                        新建当天计划
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="plan-form-side">
              <div>
                <h3>{editingPlan ? "编辑计划" : "新建计划"}</h3>
                <form className="admin-form" id="admin-plan-form" onSubmit={submitPlan}>
                  <div className="form-group">
                    <label>日期</label>
                    <input
                      type="date"
                      value={planForm.date}
                      onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>标题</label>
                    <input
                      value={planForm.title}
                      onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>今日目标</label>
                    <input
                      value={planForm.goal}
                      onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>上午</label>
                      <input
                        value={planForm.morning}
                        onChange={(e) => setPlanForm({ ...planForm, morning: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>下午</label>
                      <input
                        value={planForm.afternoon}
                        onChange={(e) => setPlanForm({ ...planForm, afternoon: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>晚上</label>
                      <input
                        value={planForm.evening}
                        onChange={(e) => setPlanForm({ ...planForm, evening: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>状态</label>
                      <select
                        value={planForm.status}
                        onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>今日复盘（完成后填写）</label>
                    <textarea
                      rows="3"
                      value={planForm.review}
                      onChange={(e) => setPlanForm({ ...planForm, review: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {editingPlan ? "保存修改" : "创建计划"}
                    </button>
                    <button type="button" className="btn" onClick={clearPlanForm}>
                      清空表单
                    </button>
                    {(editingArticle || editingPlan) && (
                      <button type="button" className="btn" onClick={cancelEdit}>
                        取消编辑
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div>
                <h3>计划列表（{plans.length}）</h3>
                {plans.length === 0 ? (
                  <p className="muted">暂无计划，创建第一条计划。</p>
                ) : (
                  <ul className="admin-list">
                    {plans.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.date} · {p.title}
                          <span
                            className={`status ${toStatusClass(p.status)}`}
                            style={{ marginLeft: 8 }}
                          >
                            {toStatusLabel(p.status)}
                          </span>
                        </span>
                        <span className="admin-actions">
                          <button onClick={() => editPlan(p)}>编辑</button>
                          <button className="danger" onClick={() => deletePlan(p.date)}>
                            删除
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ 阶段计划管理 ============ */}
      {tab === "sprint" && (
        <section className="wb-card">
          <div className="library-head">
            <div>
              <h2>🚀 阶段计划管理</h2>
              <p className="muted">
                管理阶段冲刺计划的真实记录（时间安排 / 完成记录 / 睡眠记录）。课程 / 应用 / 记账 / 饮食 / 身体暂未接入。
              </p>
            </div>
          </div>
          <div className="filter-bar">
            {[
              { key: "time", label: "⏰ 时间安排" },
              { key: "completion", label: "✅ 完成记录" },
              { key: "sleep", label: "🌙 睡眠记录" },
              { key: "more", label: "🧩 其他" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`filter-chip${sprintSubTab === t.key ? " active" : ""}`}
                onClick={() => setSprintSubTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {sprintSubTab === "time" && <SprintTimeBlocks isAdmin />}
          {sprintSubTab === "completion" && <SprintCompletions isAdmin />}
          {sprintSubTab === "sleep" && <SprintSleep isAdmin />}

          {sprintSubTab === "more" && (
            <div className="sprint-more-grid">
              {[
                { icon: "📖", title: "课程" },
                { icon: "📱", title: "应用" },
                { icon: "💰", title: "记账" },
                { icon: "🍱", title: "饮食" },
                { icon: "⚖️", title: "身体" },
              ].map((m) => (
                <div key={m.title} className="sprint-more-card">
                  <h3>
                    {m.icon} {m.title}
                  </h3>
                  <p className="muted">
                    该模块暂未接入，后台暂不提供假表单。后续接入真实后端后再开放管理。
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============ 学习笔记 ============ */}
      {tab === "notes" && <NotesAdmin />}

      {/* ============ 关于我管理 ============ */}
      {tab === "about" && <AboutProfileAdmin showMsg={showMsg} />}

      {/* ============ 运维状态 ============ */}
      {tab === "ops" && (
        <div className="wb-grid">
          <section className="wb-card">
            <h2>🛠️ 运维状态</h2>
            <ul className="ops-list">
              <li>
                <span className="ops-label">线上地址</span>
                <a href="https://chenji.felixfu.xyz" target="_blank" rel="noopener noreferrer">
                  https://chenji.felixfu.xyz ↗
                </a>
              </li>
              <li>
                <span className="ops-label">部署方式</span>
                <span>Docker + GitHub Actions（push 到 main 自动部署）</span>
              </li>
              <li>
                <span className="ops-label">GitHub 仓库</span>
                <a
                  href="https://github.com/chenji0421/chenji-learning-hub-fullstack"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  chenji0421/chenji-learning-hub-fullstack ↗
                </a>
              </li>
              <li>
                <span className="ops-label">GitHub Actions</span>
                <a
                  href="https://github.com/chenji0421/chenji-learning-hub-fullstack/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看自动部署流水线 ↗
                </a>
              </li>
              <li>
                <span className="ops-label">健康检查</span>
                <span>
                  {healthLoading
                    ? "检查中…"
                    : health
                      ? health.ok
                        ? `✅ ${JSON.stringify(health.data)}`
                        : `❌ ${health.error}`
                      : "未检查"}
                </span>
              </li>
            </ul>
            <div className="form-actions">
              <button className="btn" onClick={runHealthCheck}>
                重新检查后端健康
              </button>
            </div>
          </section>

          <section className="wb-card">
            <h2>📜 版本记录</h2>
            {changelog.length === 0 ? (
              <p className="muted">暂无更新记录。</p>
            ) : (
              <>
                <ul className="ops-list">
                  <li>
                    <span className="ops-label">当前版本</span>
                    <span className="badge badge-pub">{changelog[0].version}</span>
                  </li>
                  <li>
                    <span className="ops-label">最近更新</span>
                    <span>{changelog[0].date}</span>
                  </li>
                  <li>
                    <span className="ops-label">更新标题</span>
                    <span>{changelog[0].title}</span>
                  </li>
                </ul>
                <div className="form-actions" style={{ marginTop: 14 }}>
                  <a className="btn" href="#/changelog">
                    📜 查看更新日志
                  </a>
                </div>
              </>
            )}
          </section>

          <section className="wb-card">
            <h2>📋 说明</h2>
            <p className="muted" style={{ margin: 0 }}>
              后台不会提供在网页里直接重启服务器或删除数据库等危险操作。
              部署与数据维护请通过 GitHub Actions 和服务器脚本完成，详见{" "}
              <code>docs/guides/</code>。
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
