import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { EmptyState, pad, todayStr } from "./SprintShared.jsx";

// 时间安排：先选日期，再看当天每个时间段做什么。管理员可新增 / 编辑 / 删除，访客只读。
export default function SprintTimeBlocks({ isAdmin }) {
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null); // 正在编辑的记录 id，null 表示新建
  const [form, setForm] = useState({ time_range: "", task: "", note: "", category: "" });

  const showMsg = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  const refresh = () => {
    api
      .listTimeBlocks(date)
      .then(setItems)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    setItems(null);
    setError("");
    setEditing(null);
    setForm({ time_range: "", task: "", note: "", category: "" });
    refresh();
  }, [date]);

  const startNew = () => {
    setEditing("new");
    setForm({ time_range: "", task: "", note: "", category: "" });
  };
  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      time_range: item.time_range,
      task: item.task,
      note: item.note,
      category: item.category,
    });
  };
  const cancel = () => {
    setEditing(null);
    setForm({ time_range: "", task: "", note: "", category: "" });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.time_range.trim() || !form.task.trim()) {
      showMsg("时间段和「要做什么」不能为空", "error");
      return;
    }
    try {
      if (editing === "new") {
        await api.createTimeBlock({ date, ...form, sort_order: 0, is_public: true });
        showMsg("时间段已新增");
      } else {
        await api.updateTimeBlock(editing, form);
        showMsg("时间段已更新");
      }
      cancel();
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("确定删除这个时间段？此操作不可撤销。")) return;
    try {
      await api.deleteTimeBlock(id);
      showMsg("时间段已删除");
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
          <h2>⏰ 每日时间段安排</h2>
          <p className="muted">先选择日期，再按时间段看当天该做什么；每一天都可以单独修改。</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sprint-date-input"
        />
      </div>

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      {items === null ? (
        <div className="loading">加载中…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="这一天还没有时间安排"
          desc={isAdmin ? "点击下面按钮，为这一天添加第一条时间段安排。" : "等待管理员添加真实的时间安排记录。"}
        >
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={startNew}>
              ＋ 新增时间段
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="sprint-table-wrap">
          <table className="sprint-table">
            <thead>
              <tr>
                <th>时间段</th>
                <th>要做什么</th>
                <th>重点 / 说明</th>
                <th>类型</th>
                {isAdmin && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="sprint-cell-time">{item.time_range}</td>
                  <td>{item.task}</td>
                  <td className="muted">{item.note || <span className="field-empty">未填写</span>}</td>
                  <td>{item.category || <span className="field-empty">未填写</span>}</td>
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
      )}

      {isAdmin && (
        <>
          {editing === null && items !== null && items.length > 0 && (
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={startNew}>
                ＋ 新增时间段
              </button>
            </div>
          )}

          {editing !== null && (
            <form className="sprint-edit-card" onSubmit={save}>
              <h3>{editing === "new" ? "新增时间段" : "编辑时间段"}</h3>
              <div className="form-row">
                <label>
                  时间段
                  <input
                    value={form.time_range}
                    onChange={(e) => setForm({ ...form, time_range: e.target.value })}
                    placeholder="如：08:00-09:30"
                    required
                  />
                </label>
                <label>
                  类型
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="如：学习 / 生活"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  要做什么
                  <input
                    value={form.task}
                    onChange={(e) => setForm({ ...form, task: e.target.value })}
                    placeholder="如：复习线性代数第 4 章"
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  重点 / 说明
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="选填"
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

      {isAdmin && items !== null && items.length === 0 && (
        <p className="muted" style={{ marginTop: 10 }}>
          日期说明：{date}
        </p>
      )}
    </section>
  );
}
