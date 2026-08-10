import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { CssBarChart, EmptyState, SvgLineChart, recentDays, todayStr } from "./SprintShared.jsx";

// 睡眠记录：管理员新增真实作息记录，访客只读。最近 7 条 + 最近 7 天时长折线 / 柱状图。
export default function SprintSleep({ isAdmin }) {
  const [records, setRecords] = useState(null); // 全部睡眠记录（按日期倒序）
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    date: todayStr(),
    sleep_time: "",
    wake_time: "",
    duration_hours: "",
    quality: "",
    note: "",
  });

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const refresh = () => {
    api
      .listSleep()
      .then(setRecords)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
  }, []);

  // 最近 7 条（后端已按日期倒序，前端再兜底一次）
  const recent7 = useMemo(() => (records || []).slice(0, 7), [records]);

  // 最近 7 天睡眠时长（小时）：按入睡日期匹配，没有记录显示 0 空状态
  const weekDays = recentDays(7);
  const byDate = useMemo(() => {
    const m = {};
    for (const r of records || []) m[r.date] = r;
    return m;
  }, [records]);
  const weekPoints = weekDays.map((d) => ({
    label: d.slice(5),
    value: byDate[d] ? Number(byDate[d].duration_hours || 0).toFixed(1) : 0,
    cls: "cls-sleep",
  }));

  const startNew = () => {
    setEditing("new");
    setForm({
      date: todayStr(),
      sleep_time: "",
      wake_time: "",
      duration_hours: "",
      quality: "",
      note: "",
    });
  };
  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      date: item.date,
      sleep_time: item.sleep_time,
      wake_time: item.wake_time,
      duration_hours: item.duration_hours ? String(item.duration_hours) : "",
      quality: item.quality,
      note: item.note,
    });
  };
  const cancel = () => {
    setEditing(null);
    setForm({ date: todayStr(), sleep_time: "", wake_time: "", duration_hours: "", quality: "", note: "" });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.date || !form.sleep_time || !form.wake_time) {
      showMsg("日期、入睡时间和起床时间不能为空", "error");
      return;
    }
    const duration = form.duration_hours === "" ? null : Number(form.duration_hours);
    const payload = {
      date: form.date,
      sleep_time: form.sleep_time,
      wake_time: form.wake_time,
      duration_hours: Number.isFinite(duration) ? duration : 0.0,
      quality: form.quality,
      note: form.note,
      is_public: true,
    };
    try {
      if (editing === "new") {
        await api.createSleep(payload);
        showMsg("睡眠记录已新增");
      } else {
        await api.updateSleep(editing, payload);
        showMsg("睡眠记录已更新");
      }
      cancel();
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("确定删除这条睡眠记录？此操作不可撤销。")) return;
    try {
      await api.deleteSleep(id);
      showMsg("睡眠记录已删除");
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
          <h2>🌙 睡眠记录</h2>
          <p className="muted">记录入睡 / 起床时间和睡眠时长，图表只来自真实睡眠记录。</p>
        </div>
      </div>

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      {records === null ? (
        <div className="loading">加载中…</div>
      ) : (
        <>
          {/* 图表 */}
          <div className="sprint-charts">
            <div className="sprint-chart-card">
              <h3>最近 7 天睡眠时长（折线）</h3>
              {records.length === 0 ? (
                <EmptyState title="暂无睡眠记录" desc="管理员新增真实睡眠记录后，这里会显示睡眠时长曲线。" />
              ) : (
                <SvgLineChart points={weekPoints} unit="h" />
              )}
            </div>
            <div className="sprint-chart-card">
              <h3>最近 7 天睡眠时长（柱状）</h3>
              {records.length === 0 ? (
                <EmptyState title="暂无睡眠记录" desc="管理员新增真实睡眠记录后，这里会显示睡眠时长柱状图。" />
              ) : (
                <CssBarChart points={weekPoints} unit="h" />
              )}
            </div>
          </div>

          {/* 最近 7 条列表 */}
          <h3 className="sprint-sub-head">最近 7 条睡眠记录</h3>
          {recent7.length === 0 ? (
            <EmptyState
              title="还没有睡眠记录"
              desc={isAdmin ? "点击下方按钮，新增第一条真实睡眠记录。" : "等待管理员添加真实睡眠记录。"}
            >
              {isAdmin && (
                <button type="button" className="btn btn-primary" onClick={startNew}>
                  ＋ 新增睡眠记录
                </button>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="sprint-table-wrap">
                <table className="sprint-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>入睡</th>
                      <th>起床</th>
                      <th>时长</th>
                      <th>质量 / 备注</th>
                      {isAdmin && <th>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recent7.map((item) => (
                      <tr key={item.id}>
                        <td className="sprint-cell-time">{item.date}</td>
                        <td>{item.sleep_time}</td>
                        <td>{item.wake_time}</td>
                        <td>{item.duration_hours != null ? `${item.duration_hours} 小时` : <span className="field-empty">未填写</span>}</td>
                        <td className="muted">
                          {item.quality || item.note || <span className="field-empty">未填写</span>}
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
                    ＋ 新增睡眠记录
                  </button>
                </div>
              )}
            </>
          )}

          {/* 管理员编辑表单 */}
          {isAdmin && editing !== null && (
            <form className="sprint-edit-card" onSubmit={save}>
              <h3>{editing === "new" ? "新增睡眠记录" : "编辑睡眠记录"}</h3>
              <div className="form-row">
                <label>
                  日期（入睡日）
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </label>
                <label>
                  入睡时间
                  <input
                    type="time"
                    value={form.sleep_time}
                    onChange={(e) => setForm({ ...form, sleep_time: e.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  起床时间
                  <input
                    type="time"
                    value={form.wake_time}
                    onChange={(e) => setForm({ ...form, wake_time: e.target.value })}
                    required
                  />
                </label>
                <label>
                  睡眠时长（小时）
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={form.duration_hours}
                    onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                    placeholder="如：8.5"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  睡眠质量 / 备注
                  <input
                    value={form.quality}
                    onChange={(e) => setForm({ ...form, quality: e.target.value })}
                    placeholder="如：睡得不错"
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
