import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { CssBarChart, EmptyState, SvgLineChart, pad, recentDays, todayStr } from "./SprintShared.jsx";

// 完成度计算规则（真实数据）：
// 完成 = 1，部分 = 0.5，未完成 = 0
// 今日完成度 = 当天得分 / 当天记录数 * 100，无记录时显示 0，不放假数据
const STATUS_SCORE = { 完成: 1, 部分: 0.5, 未完成: 0 };
const STATUS_ORDER = ["完成", "部分", "未完成"];

// 一天的完成度（0-100），无记录返回 0
const dayRate = (list) => {
  if (!list.length) return 0;
  const sum = list.reduce((acc, r) => acc + (STATUS_SCORE[r.status] ?? 0), 0);
  return Math.round((sum / list.length) * 100);
};

export default function SprintCompletions({ isAdmin }) {
  const [date, setDate] = useState(todayStr());
  const [all, setAll] = useState(null); // 全量完成记录（跨天统计用）
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    time_range: "",
    planned_task: "",
    actual_done: "",
    status: "未完成",
    note: "",
  });

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const refresh = () => {
    api
      .listCompletions()
      .then(setAll)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);

  // 按天分组（真实数据）
  const byDate = useMemo(() => {
    const m = {};
    for (const r of all || []) {
      (m[r.date] || (m[r.date] = [])).push(r);
    }
    return m;
  }, [all]);

  const todayItems = (all || []).filter((r) => r.date === date);
  const todayCounts = STATUS_ORDER.map((s) => todayItems.filter((r) => r.status === s).length);
  const todayScore = dayRate(todayItems);

  // 最近 7 天完成度（只有真实有记录的日期才有值，没有记录的显示 0 空状态）
  const weekDays = recentDays(7);
  const weekPoints = weekDays.map((d) => ({
    label: d.slice(5),
    value: (byDate[d] || []).length ? dayRate(byDate[d]) : 0,
    cls: "cls-rate",
  }));

  const startNew = () => {
    setEditing("new");
    setForm({ time_range: "", planned_task: "", actual_done: "", status: "未完成", note: "" });
  };
  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      time_range: item.time_range,
      planned_task: item.planned_task,
      actual_done: item.actual_done,
      status: STATUS_ORDER.includes(item.status) ? item.status : "未完成",
      note: item.note,
    });
  };
  const cancel = () => {
    setEditing(null);
    setForm({ time_range: "", planned_task: "", actual_done: "", status: "未完成", note: "" });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.planned_task.trim()) {
      showMsg("「计划做什么」不能为空", "error");
      return;
    }
    try {
      if (editing === "new") {
        await api.createCompletion({ date, ...form, sort_order: 0, is_public: true });
        showMsg("完成记录已新增");
      } else {
        await api.updateCompletion(editing, form);
        showMsg("完成记录已更新");
      }
      cancel();
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("确定删除这条完成记录？此操作不可撤销。")) return;
    try {
      await api.deleteCompletion(id);
      showMsg("完成记录已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  if (error) return <div className="error-box">加载失败：{error}</div>;

  return (
    <section className="sprint-section">
      <div className="sprint-section-head">
        <div>
          <h2>✅ 完成记录与完成度</h2>
          <p className="muted">选择日期查看当天完成情况；统计与图表全部来自真实完成记录。</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sprint-date-input"
        />
      </div>

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      {all === null ? (
        <div className="loading">加载中…</div>
      ) : (
        <>
          {/* 今日统计 */}
          <div className="sprint-stats-nums">
            <div className="sprint-stat-card">
              <span className="sprint-stat-num">{todayScore}%</span>
              <span className="sprint-stat-label">今日完成度</span>
            </div>
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className={`sprint-stat-card st-${s}`}>
                <span className="sprint-stat-num">{todayCounts[i]}</span>
                <span className="sprint-stat-label">{s}</span>
              </div>
            ))}
          </div>

          {/* 最近 7 天图表 */}
          <div className="sprint-charts">
            <div className="sprint-chart-card">
              <h3>最近 7 天完成度（折线）</h3>
              {all.length === 0 ? (
                <EmptyState title="暂无完成记录" desc="管理员新增完成记录后，这里会显示真实完成度曲线。" />
              ) : (
                <SvgLineChart points={weekPoints} unit="%" />
              )}
            </div>
            <div className="sprint-chart-card">
              <h3>最近 7 天完成度（柱状）</h3>
              {all.length === 0 ? (
                <EmptyState title="暂无完成记录" desc="管理员新增完成记录后，这里会显示真实完成度柱状图。" />
              ) : (
                <CssBarChart points={weekPoints} unit="%" />
              )}
            </div>
          </div>

          {/* 当天记录表 */}
          <h3 className="sprint-sub-head">
            {date} 的完成记录（{todayItems.length}）
          </h3>
          {todayItems.length === 0 ? (
            <EmptyState
              title="这一天还没有完成记录"
              desc={isAdmin ? "点击下方按钮，为这一天新增真实完成记录。" : "等待管理员添加完成记录。"}
            >
              {isAdmin && (
                <button type="button" className="btn btn-primary" onClick={startNew}>
                  ＋ 新增完成记录
                </button>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="sprint-table-wrap">
                <table className="sprint-table">
                  <thead>
                    <tr>
                      <th>时间段</th>
                      <th>计划做什么</th>
                      <th>实际完成</th>
                      <th>状态</th>
                      {isAdmin && <th>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {todayItems.map((item) => (
                      <tr key={item.id}>
                        <td className="sprint-cell-time">{item.time_range || <span className="field-empty">未填写</span>}</td>
                        <td>{item.planned_task}</td>
                        <td className="muted">{item.actual_done || <span className="field-empty">未填写</span>}</td>
                        <td>
                          <span className={`status ${item.status === "完成" ? "done" : item.status === "部分" ? "pending" : "todo"}`}>
                            {item.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="sprint-cell-actions">
                            <button className="btn btn-sm" onClick={() => startEdit(item)}>
                              编辑
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(item.id)}>
                              删除
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin && (
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" onClick={startNew}>
                    ＋ 新增完成记录
                  </button>
                </div>
              )}
            </>
          )}

          {/* 管理员编辑表单 */}
          {isAdmin && editing !== null && (
            <form className="sprint-edit-card" onSubmit={save}>
              <h3>{editing === "new" ? "新增完成记录" : "编辑完成记录"}</h3>
              <div className="form-row">
                <label>
                  时间段
                  <input
                    value={form.time_range}
                    onChange={(e) => setForm({ ...form, time_range: e.target.value })}
                    placeholder="如：上午"
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
                  计划做什么
                  <input
                    value={form.planned_task}
                    onChange={(e) => setForm({ ...form, planned_task: e.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  实际完成
                  <input
                    value={form.actual_done}
                    onChange={(e) => setForm({ ...form, actual_done: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  备注
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editing === "new" ? "保存新增" : "保存修改"}
                </button>
                <button type="button" className="btn" onClick={cancel}>
                  取消
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
