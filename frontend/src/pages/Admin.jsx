import { useEffect, useState } from "react";
import { api, getToken } from "../api.js";
import renderMarkdown from "../markdown.jsx";

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
const STATUS_CLASS = { 进行中: "pending", 已完成: "done", 未开始: "todo" };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const pad = (n) => String(n).padStart(2, "0");

export default function Admin({ user }) {
  const [articles, setArticles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [message, setMessage] = useState("");
  // 计划月历：当前展示的月份 + 选中的日期（默认今天）
  const [planMonth, setPlanMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const refresh = () => {
    api.listArticles().then(setArticles).catch(() => {});
    api.listPlans().then(setPlans).catch(() => {});
  };

  useEffect(() => {
    refresh();
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
        <p>只有 GitHub 用户名为 <code>chenji0421</code> 的管理员可以管理内容。</p>
      </div>
    );
  }

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  };

  const cancelEdit = () => {
    setEditingArticle(null);
    setEditingPlan(null);
    setArticleForm(EMPTY_ARTICLE);
    setPlanForm(EMPTY_PLAN);
  };

  // ---------- 文章操作 ----------
  const submitArticle = async (status) => {
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
    } catch (err) {
      showMsg(err.message);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteArticle = async (id) => {
    if (!window.confirm("确定删除这篇文章？此操作不可撤销。")) return;
    try {
      await api.deleteArticle(id);
      showMsg("文章已删除");
      refresh();
    } catch (err) {
      showMsg(err.message);
    }
  };

  // ---------- 计划操作 ----------
  const submitPlan = async (e) => {
    e.preventDefault();
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
      showMsg(err.message);
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
      status: p.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePlan = async (date) => {
    if (!window.confirm("确定删除这条计划？此操作不可撤销。")) return;
    try {
      await api.deletePlan(date);
      showMsg("计划已删除");
      refresh();
    } catch (err) {
      showMsg(err.message);
    }
  };

  // 从月历点击「新建当天计划」：把表单日期预填成选中的那一天
  const newPlanForDate = (date) => {
    setEditingArticle(null);
    setEditingPlan(null);
    setPlanForm({ ...EMPTY_PLAN, date });
    document.getElementById("admin-plan-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // 计划月历：按日期索引 + 当前月的格子数据
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

  const draftCount = articles.filter((a) => a.status !== "published").length;

  return (
    <div className="admin workbench">
      <div className="wb-head">
        <div>
          <h1>管理后台</h1>
          <p className="muted">
            工作台 · {user.username}（管理员）
          </p>
        </div>
        {message && <div className="toast">{message}</div>}
      </div>

      <div className="wb-stats">
        <div className="stat-card">
          <div className="stat-num">{articles.length}</div>
          <div className="stat-label">全部文章</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{draftCount}</div>
          <div className="stat-label">草稿</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{plans.length}</div>
          <div className="stat-label">公开计划</div>
        </div>
      </div>

      <div className="wb-grid">
        <section className="wb-card">
          <h2>📝 文章管理</h2>
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
                  />
                </div>
                <div className="form-group">
                  <label>标签（逗号分隔）</label>
                  <input
                    value={articleForm.tagsInput}
                    onChange={(e) => setArticleForm({ ...articleForm, tagsInput: e.target.value })}
                    placeholder="GitHub Pages, 前端"
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
                <label>正文（Markdown：支持 # 标题、- 列表、{">"} 引用、段落）</label>
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

          <h3 style={{ margin: "20px 0 10px" }}>文章列表（{articles.length}）</h3>
          {articles.length === 0 ? (
            <p className="muted">还没有文章，用上面的表单创建第一篇。</p>
          ) : (
            <ul className="admin-list">
              {articles.map((a) => (
                <li key={a.id}>
                  <span className="admin-item">
                    {a.status === "published" ? (
                      <span className="badge badge-pub">已发布</span>
                    ) : (
                      <span className="badge badge-draft">草稿</span>
                    )}
                    {a.title}
                    {a.tags && a.tags.length > 0 && (
                      <span className="muted"> · {a.tags.join(" / ")}</span>
                    )}
                  </span>
                  <span className="admin-actions">
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
                      <span
                        className={`status ${STATUS_CLASS[dayPlan.status] || "pending"}`}
                      >
                        {dayPlan.status}
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
                    <label>状态</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                    >
                      <option>进行中</option>
                      <option>已完成</option>
                      <option>未开始</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>目标</label>
                    <input
                      value={planForm.goal}
                      onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
                    />
                  </div>
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
                  <div className="form-group">
                    <label>晚上</label>
                    <input
                      value={planForm.evening}
                      onChange={(e) => setPlanForm({ ...planForm, evening: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>复盘（完成后填写）</label>
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
                  <p className="muted">还没有计划，用上面的表单创建第一条。</p>
                ) : (
                  <ul className="admin-list">
                    {plans.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.date} · {p.title}
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
      </div>
    </div>
  );
}
