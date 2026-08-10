import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// 计划状态 → CSS 类（与 Admin 后台一致的配色约定）
const STATUS_CLASS = { 进行中: "pending", 已完成: "done", 未开始: "todo" };
const STATUS_OPTIONS = ["进行中", "已完成", "未开始"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

const EMPTY_FORM = {
  date: "",
  title: "",
  goal: "",
  morning: "",
  afternoon: "",
  evening: "",
  review: "",
  status: "进行中",
};

function pad(n) {
  return String(n).padStart(2, "0");
}

// 解析 hash 子路径：#/plans 年表 · #/plans/2026 年份 · #/plans/2026-08 月表 · #/plans/2026-08-10 日计划
function parseHashPath(hashPath) {
  const seg = (hashPath || "plans").split("/").filter(Boolean);
  if (seg.length >= 2) {
    const [y, m, d] = seg[1].split("-");
    if (y && m && d) return { view: "day", date: `${y}-${m}-${d}` };
    if (y && m) return { view: "month", year: +y, month: +m };
    if (y) return { view: "year", year: +y };
  }
  return { view: "year", year: new Date().getFullYear() };
}

export default function Plans({ user, hashPath }) {
  const location = useMemo(() => parseHashPath(hashPath), [hashPath]);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);
  const isAdmin = !!user && user.is_admin;

  const refresh = () => {
    api.listPlans().then(setPlans).catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    // 错误提示多停留一会，方便用户看清失败原因
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  // 按日期索引，日计划详情直接命中
  const byDate = useMemo(() => {
    const m = {};
    for (const p of plans || []) m[p.date] = p;
    return m;
  }, [plans]);

  const startEdit = (plan) => {
    setEditing(true);
    setMessage("");
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
            status: plan.status,
          }
        : { ...EMPTY_FORM, date: location.date }
    );
  };

  const savePlan = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      const existing = byDate[location.date];
      if (existing) {
        await api.updatePlan(existing.date, payload);
      } else {
        await api.createPlan(payload);
      }
      showMsg("计划已保存");
      setEditing(false);
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

  // ---------- 年表视图：一年 12 个月，有计划的月份显示条数 ----------
  if (location.view === "year") {
    const counts = {};
    for (const p of plans) {
      const key = p.date.slice(0, 7);
      counts[key] = (counts[key] || 0) + 1;
    }
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${location.year}-${pad(i + 1)}`;
      return { key, name: MONTH_NAMES[i], count: counts[key] || 0 };
    });
    return (
      <div className="plans">
        <h1>公开计划 · {location.year} 年</h1>
        <p className="muted">访客只能查看；管理员登录后可以在计划页编辑当天计划。</p>
        {plans.length === 0 && (
          <div className="empty-state">
            <h2>还没有公开计划</h2>
            <p>管理员登录后可以按日期新增每日计划。</p>
          </div>
        )}
        <div className="nav-bar">
          <a href={`#/plans/${location.year - 1}`} className="btn">◀ {location.year - 1}</a>
          <span className="nav-label">{location.year}</span>
          <a href={`#/plans/${location.year + 1}`} className="btn">{location.year + 1} ▶</a>
        </div>
        <div className="year-grid">
          {months.map((m) => (
            <a
              key={m.key}
              className={`month-card ${m.count ? "has" : ""}`}
              href={`#/plans/${m.key}`}
            >
              <span className="month-name">{m.name}</span>
              <span className="month-count">{m.count ? `${m.count} 条计划` : "无计划"}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // ---------- 月表视图：真实日历 ----------
  if (location.view === "month") {
    const { year, month } = location;
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
    return (
      <div className="plans">
        <h1>公开计划 · {year} 年 {month} 月</h1>
        <div className="nav-bar">
          <a href={`#/plans/${prevMonth}`} className="btn">◀ 上月</a>
          <a href={`#/plans/${year}`} className="btn">回到 {year} 年</a>
          <a href={`#/plans/${nextMonth}`} className="btn">下月 ▶</a>
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
              <a
                key={c.key}
                href={`#/plans/${c.key}`}
                className={`cal-cell ${c.plan ? "has-plan" : ""}`}
              >
                <span className="cal-day">{c.day}</span>
                {c.plan && (
                  <>
                    <span className="cal-title">{c.plan.title}</span>
                    <span className={`status ${STATUS_CLASS[c.plan.status] || "pending"}`}>
                      {c.plan.status}
                    </span>
                  </>
                )}
              </a>
            )
          )}
        </div>
      </div>
    );
  }

  // ---------- 日计划视图 ----------
  const date = location.date;
  const plan = byDate[date];
  const [y, m] = date.split("-");
  const monthKey = `${y}-${m}`;

  if (editing) {
    return (
      <div className="plans">
        <h1>{date} 的计划</h1>
        {message && (
          <div className={`toast toast-${message.type}`}>{message.text}</div>
        )}
        <form className="admin-form plan-edit-form" onSubmit={savePlan}>
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
            <label>
              状态
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              目标
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
          </div>
          <div className="form-row">
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
          </div>
          <div className="form-row">
            <label>
              复盘（完成后填写）
              <textarea
                rows="3"
                value={form.review}
                onChange={(e) => setForm({ ...form, review: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {plan ? "保存修改" : "创建计划"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(false);
                setMessage("");
              }}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="plans">
      <h1>{date} 的计划</h1>
      <a href={`#/plans/${monthKey}`} className="back-link">
        ← 回到 {y} 年 {+m} 月
      </a>
      {!plan ? (
        <div className="empty-state">
          <h2>这一天没有计划</h2>
          {isAdmin ? (
            <p>管理员可以点击下面的按钮，为这一天创建一条计划。</p>
          ) : (
            <p>访客只能查看，计划由管理员维护。</p>
          )}
          {isAdmin && (
            <div className="form-actions" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => startEdit(null)}>
                添加当天计划
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="plan-card day-plan">
          <div className="day-plan-head">
            <span className={`status ${STATUS_CLASS[plan.status] || "pending"}`}>
              {plan.status}
            </span>
          </div>
          <h2 className="plan-title">{plan.title}</h2>
          {plan.goal && <p className="plan-goal">目标：{plan.goal}</p>}
          <ul className="plan-slots">
            {plan.morning && (
              <li>
                <b>上午：</b>
                {plan.morning}
              </li>
            )}
            {plan.afternoon && (
              <li>
                <b>下午：</b>
                {plan.afternoon}
              </li>
            )}
            {plan.evening && (
              <li>
                <b>晚上：</b>
                {plan.evening}
              </li>
            )}
          </ul>
          {plan.review && <p className="plan-review">复盘：{plan.review}</p>}
          {isAdmin && (
            <div className="form-actions">
              <button className="btn" onClick={() => startEdit(plan)}>
                编辑这条计划
              </button>
              <button className="btn btn-danger" onClick={() => deletePlan(date)}>
                删除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
