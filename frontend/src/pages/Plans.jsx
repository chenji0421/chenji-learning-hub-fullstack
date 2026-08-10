import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// 计划状态 → CSS 类（与 Admin 后台一致）：未开始灰 / 进行中蓝 / 已完成绿 / 暂停橙
const STATUS_ORDER = ["未开始", "进行中", "已完成", "暂停"];
const STATUS_CLASS = { 未开始: "todo", 进行中: "pending", 已完成: "done", 暂停: "paused" };
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
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 状态兼容映射：显示用中文标签，样式用固定 class
const toStatusLabel = (s) => STATUS_LABEL[s] || s || "未开始";
const toStatusClass = (s) => STATUS_CLASS[toStatusLabel(s)] || "pending";

// 空字段统一显示「未填写」，避免布局塌陷
const slot = (v) => (v && v.trim() ? v : <span className="field-empty">未填写</span>);

// 计划详情统一展示（日期 / 标题 / 今日目标 / 上午 / 下午 / 晚上 / 今日复盘 / 状态）
function PlanDetail({ plan, showDate = true }) {
  return (
    <>
      <div className="plan-card-head">
        {showDate && <span className="plan-date">{plan.date}</span>}
        <span className={`status ${toStatusClass(plan.status)}`}>
          {toStatusLabel(plan.status)}
        </span>
      </div>
      <h3 className="plan-title">
        {plan.title ? plan.title : <span className="field-empty">未填写</span>}
      </h3>
      <p className="plan-goal">
        <b>今日目标：</b>
        {slot(plan.goal)}
      </p>
      <ul className="plan-slots">
        <li>
          <b>上午：</b>
          {slot(plan.morning)}
        </li>
        <li>
          <b>下午：</b>
          {slot(plan.afternoon)}
        </li>
        <li>
          <b>晚上：</b>
          {slot(plan.evening)}
        </li>
      </ul>
      <p className="plan-review">
        <b>今日复盘：</b>
        {slot(plan.review)}
      </p>
    </>
  );
}

const EMPTY_FORM = {
  date: "",
  title: "",
  goal: "",
  morning: "",
  afternoon: "",
  evening: "",
  review: "",
  status: "未开始",
};

const pad = (n) => String(n).padStart(2, "0");

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};
const nowMonth = () => todayStr().slice(0, 7);

// 说明：计划模型没有 category 字段，不做「假分类统计」——分类筛选已移除，
// 只保留真实的状态筛选与关键词搜索（数据全部来自后端数据库）。

// hash 子路径：#/plans 月视图（默认） · #/plans/list 列表 · #/plans/today 今日
// 深链：#/plans/day/YYYY-MM-DD · #/plans/month/YYYY-MM（兼容旧的 #/plans/YYYY-MM 与 #/plans/YYYY-MM-DD）
function parseHashPath(hashPath) {
  const seg = (hashPath || "plans").split("/").filter(Boolean);
  if (seg[0] !== "plans") return { view: "month" };
  const sub = seg[1];
  if (sub === "list") return { view: "list" };
  if (sub === "today") return { view: "today" };
  if (sub === "day" && /^\d{4}-\d{2}-\d{2}$/.test(seg[2] || "")) {
    return { view: "day", date: seg[2] };
  }
  if (sub === "month" && /^\d{4}-\d{2}$/.test(seg[2] || "")) {
    return { view: "month", monthKey: seg[2] };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(sub || "")) {
    return { view: "day", date: sub };
  }
  if (/^\d{4}-\d{2}$/.test(sub || "")) {
    return { view: "month", monthKey: sub };
  }
  return { view: "month" };
}

export default function Plans({ user, hashPath }) {
  const location = useMemo(() => parseHashPath(hashPath), [hashPath]);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [monthKey, setMonthKey] = useState(nowMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editing, setEditing] = useState(false);
  const [editingDate, setEditingDate] = useState(null); // 正在编辑的原始日期，避免改日期时误覆盖别的计划
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);
  // 列表视图筛选
  const [statusFilter, setStatusFilter] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const isAdmin = !!user && user.is_admin;

  const refresh = () => {
    api.listPlans().then(setPlans).catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);

  // 跟随 hash 切换视图 / 月份 / 日期
  useEffect(() => {
    if (location.view === "month") {
      if (location.monthKey) setMonthKey(location.monthKey);
    } else if (location.view === "day" && location.date) {
      setSelectedDate(location.date);
    } else if (location.view === "today") {
      setSelectedDate(todayStr());
    }
  }, [location]);

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    // 错误提示多停留一会，方便用户看清失败原因
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const byDate = useMemo(() => {
    const m = {};
    for (const p of plans || []) m[p.date] = p;
    return m;
  }, [plans]);

  // 完成度统计（真实数据：全部来自后端 plans 的 status）
  // ⚠️ 必须放在下方 early return（error / plans===null）之前——否则首渲染提前 return 会少执行一次 hook，
  //    下次渲染多出 planStats 这个 useMemo，React 报「Rendered more hooks」#310 直接白屏。
  const planStats = useMemo(() => {
    const counts = { 未开始: 0, 进行中: 0, 已完成: 0, 暂停: 0 };
    for (const p of plans || []) {
      const label = toStatusLabel(p.status);
      if (label in counts) counts[label] += 1;
    }
    const total = (plans || []).length;
    const rate = total > 0 ? Math.round((counts["已完成"] / total) * 100) : 0;
    return { counts, total, rate };
  }, [plans]);

  const startEdit = (plan, fallbackDate) => {
    setEditing(true);
    setEditingDate(plan ? plan.date : null);
    setMessage(null);
    setForm(
      plan
        ? {
            date: plan.date,
            title: plan.title,
            goal: plan.goal,
            morning: plan.morning,
            afternoon: plan.afternoon,
            evening: plan.evening,
            review: plan.review,
            status: toStatusLabel(plan.status),
          }
        : { ...EMPTY_FORM, date: fallbackDate || todayStr() }
    );
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingDate(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    if (!form.date || !form.title.trim()) {
      showMsg("日期和标题不能为空", "error");
      return;
    }
    try {
      if (editingDate) {
        await api.updatePlan(editingDate, form);
        showMsg("计划已保存");
      } else {
        await api.createPlan(form);
        showMsg("计划已创建");
      }
      setEditing(false);
      setEditingDate(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
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

  if (error) return <div className="error-box">加载失败：{error}</div>;
  if (plans === null) return <div className="loading">加载中…</div>;

  // ---------- 顶部说明区 ----------
  const header = (
    <section className="plan-header">
      <div className="plan-header-head">
        <h1>📅 沉积的学习计划中心</h1>
        <p>这里记录公开学习计划、每日安排和阶段复盘。访客可以查看，管理员登录后可以编辑。</p>
      </div>
      <div className={`plan-mode-banner ${isAdmin ? "edit" : "view"}`}>
        {isAdmin
          ? "✍️ 当前是编辑模式，修改会保存到服务器数据库。"
          : "👀 当前是查看模式，只有管理员可以编辑计划。"}
      </div>
    </section>
  );

  const renderStats = () => {
    const { counts, total, rate } = planStats;
    // 柱高 = 当前数量 / 最大数量 * 100%，全 0 时无柱
    const bars = STATUS_ORDER.map((label) => ({
      label,
      value: counts[label],
      cls: STATUS_CLASS[label],
    }));
    const maxCount = Math.max(...bars.map((b) => b.value));
    return (
      <section className="plan-stats">
        <div className="plan-stats-head">
          <h2>📊 计划完成度</h2>
          <p>根据已保存的公开计划状态自动统计，不使用假数据。</p>
        </div>
        {total === 0 ? (
          <div className="plan-stats-empty">
            暂无计划数据，创建计划后会自动生成完成度统计。
          </div>
        ) : (
          <>
            <div className="plan-stats-body">
              <div className="plan-stats-nums">
                <div className="ps-item">
                  <span className="ps-num">{total}</span>
                  <span className="ps-label">总计划</span>
                </div>
                <div className="ps-item done">
                  <span className="ps-num">{counts["已完成"]}</span>
                  <span className="ps-label">已完成</span>
                </div>
                <div className="ps-item pending">
                  <span className="ps-num">{counts["进行中"]}</span>
                  <span className="ps-label">进行中</span>
                </div>
                <div className="ps-item todo">
                  <span className="ps-num">{counts["未开始"]}</span>
                  <span className="ps-label">未开始</span>
                </div>
                <div className="ps-item paused">
                  <span className="ps-num">{counts["暂停"]}</span>
                  <span className="ps-label">暂停</span>
                </div>
                <div className="ps-item rate">
                  <span className="ps-num">{rate}%</span>
                  <span className="ps-label">完成率</span>
                </div>
              </div>
              <div className="plan-chart">
                {bars.map((b) => (
                  <div key={b.label} className="plan-chart-col">
                    <div className="plan-chart-track">
                      <div
                        className={`plan-chart-bar ${b.cls}`}
                        style={{
                          height: `${
                            maxCount > 0 ? Math.round((b.value / maxCount) * 100) : 0
                          }%`,
                        }}
                        title={`${b.label}：${b.value}`}
                      />
                    </div>
                    <span className="plan-chart-label">{b.label}</span>
                    <span className="plan-chart-value">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="plan-stats-note">
              达标程度说明：当前达标程度根据「已完成」计划占全部计划的比例计算。后续如果接入更细的每日任务完成记录，可以升级为更精确的统计。
            </p>
          </>
        )}
      </section>
    );
  };

  // ---------- 视图切换 ----------
  const viewSwitch = (
    <div className="plan-view-switch" role="tablist" aria-label="计划视图">
      {[
        { key: "month", label: "月视图", href: "#/plans" },
        { key: "list", label: "列表视图", href: "#/plans/list" },
        { key: "today", label: "今日计划", href: "#/plans/today" },
      ].map((v) => (
        <a
          key={v.key}
          href={v.href}
          className={`plan-view-btn${location.view === v.key ? " active" : ""}`}
          role="tab"
          aria-selected={location.view === v.key}
        >
          {v.label}
        </a>
      ))}
    </div>
  );

  // ---------- 编辑表单（管理员） ----------
  const currentEditPlan = editingDate ? byDate[editingDate] : byDate[form.date];
  const editForm = editing && (
    <section className="plan-edit-card">
      <div className="plan-edit-card-head">
        <h3>{currentEditPlan ? "编辑计划" : "新建计划"}</h3>
        {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      </div>
      <form className="admin-form" onSubmit={savePlan}>
        <div className="form-row">
          <label>
            日期
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label>
            标题
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            今日目标
            <input
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            上午
            <input
              value={form.morning}
              onChange={(e) => setForm({ ...form, morning: e.target.value })}
            />
          </label>
          <label>
            下午
            <input
              value={form.afternoon}
              onChange={(e) => setForm({ ...form, afternoon: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            晚上
            <input
              value={form.evening}
              onChange={(e) => setForm({ ...form, evening: e.target.value })}
            />
          </label>
          <label>
            状态
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            今日复盘
            <textarea
              rows="3"
              value={form.review}
              onChange={(e) => setForm({ ...form, review: e.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {currentEditPlan ? "保存修改" : "创建计划"}
          </button>
          <button type="button" className="btn" onClick={cancelEdit}>
            取消
          </button>
        </div>
      </form>
    </section>
  );

  // ---------- 月视图 ----------
  const renderMonth = () => {
    const [year, month] = monthKey.split("-").map(Number);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month)}-${pad(d)}`;
      cells.push({ key, day: d, plan: byDate[key] || null });
    }
    const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
    const dayPlan = byDate[selectedDate] || null;

    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>
            {year} 年 {month} 月
          </h1>
          <div className="nav-bar">
            <button type="button" className="btn" onClick={() => setMonthKey(prevMonth)}>
              ◀ 上月
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMonthKey(nowMonth());
                setSelectedDate(todayStr());
              }}
            >
              回到今天
            </button>
            <button type="button" className="btn" onClick={() => setMonthKey(nextMonth)}>
              下月 ▶
            </button>
          </div>
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
                {c.plan && (
                  <>
                    <span className="cal-title">{c.plan.title}</span>
                    <span className={`status ${toStatusClass(c.plan.status)}`}>
                      {toStatusLabel(c.plan.status)}
                    </span>
                  </>
                )}
              </button>
            )
          )}
        </div>

        {dayPlan ? (
          <div className="plan-card day-plan">
            <PlanDetail plan={dayPlan} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(dayPlan)}>
                  编辑当天计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(selectedDate)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="day-panel-empty">
            <p className="muted">
              {selectedDate}{" "}
              {isAdmin ? "这一天暂无计划，可以创建。" : "这一天暂无公开计划。"}
            </p>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => startEdit(null, selectedDate)}
              >
                ✍️ 创建当天的计划
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 列表视图 ----------
  const renderList = () => {
    const statusCounts = { 全部: plans.length };
    for (const s of STATUS_ORDER) {
      statusCounts[s] = plans.filter((p) => toStatusLabel(p.status) === s).length;
    }

    const kw = keyword.trim().toLowerCase();
    const filtered = plans.filter((p) => {
      if (statusFilter !== "全部" && toStatusLabel(p.status) !== statusFilter) return false;
      if (kw) {
        const hay = `${p.title || ""} ${p.goal || ""} ${p.review || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>列表视图</h1>
          <p className="muted">共 {plans.length} 条公开计划 · 数据来自后端数据库</p>
        </div>

        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">状态</span>
            <div className="filter-bar">
              {["全部", ...STATUS_ORDER].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-chip${statusFilter === s ? " active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}（{statusCounts[s] || 0}）
                </button>
              ))}
            </div>
          </div>

          <div className="filter-search">
            <span className="filter-label">搜索</span>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题、目标或复盘"
              />
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state">
            <h2>暂无公开计划</h2>
            <p>管理员登录后可以创建第一条计划。</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h2>没有符合条件的计划</h2>
            <p>换个筛选条件或关键词试试。</p>
          </div>
        ) : (
          <div className="plan-list">
            {filtered.map((p) => (
              <article key={p.id} className="plan-card">
                <PlanDetail plan={p} />
                {isAdmin && (
                  <div className="form-actions">
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(p)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => deletePlan(p.date)}
                    >
                      删除
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  // ---------- 今日计划 ----------
  const renderToday = () => {
    const date = todayStr();
    const plan = byDate[date];
    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>今日计划</h1>
          <p className="muted">{date}</p>
        </div>
        {!plan ? (
          <div className="empty-state">
            <h2>今天还没有公开计划。</h2>
            <p>访客只能查看；管理员登录后可以为今天创建计划。</p>
            {isAdmin && (
              <div className="form-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-primary" onClick={() => startEdit(null)}>
                  ✍️ 创建今天的计划
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="plan-card day-plan">
            <PlanDetail plan={plan} showDate={false} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(plan)}>
                  编辑今天的计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(date)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  // ---------- 日计划深链（#/plans/day/YYYY-MM-DD） ----------
  const renderDay = () => {
    const date = location.date || selectedDate;
    const plan = byDate[date];
    return (
      <section className="plan-view-body">
        <div className="plan-view-head">
          <h1>{date} 的计划</h1>
          <a href="#/plans" className="back-link">
            ← 回到月视图
          </a>
        </div>
        {!plan ? (
          <div className="empty-state">
            <h2>这一天暂无公开计划。</h2>
            <p>
              {isAdmin
                ? "管理员可以点击下面的按钮，为这一天创建一条计划。"
                : "访客只能查看，计划由管理员维护。"}
            </p>
            {isAdmin && (
              <div className="form-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-primary" onClick={() => startEdit(null, date)}>
                  添加当天计划
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="plan-card day-plan">
            <PlanDetail plan={plan} />
            {isAdmin && (
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => startEdit(plan)}>
                  编辑这条计划
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deletePlan(date)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="plans">
      {header}
      {renderStats()}
      {message && !editing && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      {viewSwitch}
      {editForm}
      {location.view === "month" && renderMonth()}
      {location.view === "list" && renderList()}
      {location.view === "today" && renderToday()}
      {location.view === "day" && renderDay()}
    </div>
  );
}
