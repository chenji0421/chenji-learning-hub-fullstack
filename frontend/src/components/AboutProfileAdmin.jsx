// 关于我后台编辑：管理员可编辑 About 页全部内容，访客只读前台。
// 支持：保存 / 恢复默认 / 清空表单 / 预览前台（预览的是已保存内容）。
// 分组：基本信息 / Hero 区 / 兴趣习惯 / 正在学习 / 网站说明 / 目标列表。
import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY_FORM = {
  kicker: "",
  title: "",
  subtitle: "",
  description: "",
  name: "",
  school: "",
  grade: "",
  stage: "",
  interests: "",
  current_status: "",
  hobby_cards: [{ icon: "", title: "", desc: "" }],
  learning_items: [{ name: "", desc: "" }],
  site_usage: [""],
  site_desc: "",
  goal_items: [""],
  is_public: true,
};

// 后端返回的记录 → 表单结构（空数组补一行空输入，方便直接编辑）
const toForm = (data) => ({
  kicker: data.kicker ?? "",
  title: data.title ?? "",
  subtitle: data.subtitle ?? "",
  description: data.description ?? "",
  name: data.name ?? "",
  school: data.school ?? "",
  grade: data.grade ?? "",
  stage: data.stage ?? "",
  interests: data.interests ?? "",
  current_status: data.current_status ?? "",
  hobby_cards: (data.hobby_cards || []).map((h) => ({
    icon: h.icon ?? "",
    title: h.title ?? "",
    desc: h.desc ?? "",
  })),
  learning_items: (data.learning_items || []).map((s) => ({
    name: s.name ?? "",
    desc: s.desc ?? "",
  })),
  site_usage: (data.site_usage || []).map(String),
  site_desc: data.site_desc ?? "",
  goal_items: (data.goal_items || []).map(String),
  is_public: data.is_public ?? true,
});

// 保存前清理空行：兴趣习惯按标题、正在学习按名称、字符串数组按去空白后非空
const buildPayload = (form) => ({
  ...form,
  hobby_cards: form.hobby_cards.filter((h) => h.title.trim()),
  learning_items: form.learning_items.filter((s) => s.name.trim()),
  site_usage: form.site_usage.map((s) => s.trim()).filter(Boolean),
  goal_items: form.goal_items.map((s) => s.trim()).filter(Boolean),
});

export default function AboutProfileAdmin({ showMsg }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .getAdminAboutProfile()
      .then((data) => setForm(toForm(data)))
      .catch((e) => showMsg(e.message || "加载关于我内容失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // 只挂载时加载一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // 对象列表：改某一行某个字段
  const setRowField = (key, index, field, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));

  // 字符串列表：改某一行
  const setStrRow = (key, index, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, i) => (i === index ? value : row)),
    }));

  const addRow = (key, emptyRow) =>
    setForm((f) => ({ ...f, [key]: [...(f[key] || []), emptyRow] }));

  const removeRow = (key, index) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateAboutProfile(buildPayload(form));
      showMsg("关于我内容已保存");
    } catch (e) {
      showMsg(e.message || "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("确定恢复为默认内容？当前编辑的内容会被覆盖。")) return;
    try {
      const data = await api.resetAboutProfile();
      setForm(toForm(data));
      showMsg("已恢复为默认内容");
    } catch (e) {
      showMsg(e.message || "恢复失败", "error");
    }
  };

  const clear = () => {
    if (!window.confirm("确定清空表单？清空后需要点「保存」才会生效。")) return;
    setForm(EMPTY_FORM);
    showMsg("表单已清空（保存后生效）");
  };

  const preview = () => {
    window.open("#/about", "_blank");
    showMsg("前台展示的是最近一次保存的内容");
  };

  if (loading) {
    return <div className="loading">正在加载关于我内容…</div>;
  }

  return (
    <div className="admin-form about-admin">
      <div className="library-head">
        <div>
          <h2>🙋 关于我管理</h2>
          <p className="muted">
            编辑「关于我」页面内容，访客只能查看。只填写真实信息，不编造经历。
          </p>
        </div>
      </div>

      {/* 是否公开 */}
      <section className="wb-card">
        <h3>🌍 是否公开</h3>
        <label className="about-public-row">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setField("is_public", e.target.checked)}
          />
          <span className="about-public-label">
            <strong>公开关于我页面</strong>
            <span className="about-public-hint">
              关闭后，访客会看到安全占位内容，管理员仍可编辑完整内容。
            </span>
          </span>
        </label>
      </section>

      {/* 基本信息 */}
      <section className="wb-card">
        <h3>📇 基本信息</h3>
        <div className="form-grid-2">
          <div className="form-group">
            <label>名字</label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="沉积"
            />
          </div>
          <div className="form-group">
            <label>学校</label>
            <input
              value={form.school}
              onChange={(e) => setField("school", e.target.value)}
              placeholder="浙江大学"
            />
          </div>
          <div className="form-group">
            <label>年级</label>
            <input
              value={form.grade}
              onChange={(e) => setField("grade", e.target.value)}
              placeholder="25 级本科生"
            />
          </div>
          <div className="form-group">
            <label>阶段</label>
            <input
              value={form.stage}
              onChange={(e) => setField("stage", e.target.value)}
              placeholder="准大二"
            />
          </div>
          <div className="form-group">
            <label>兴趣</label>
            <input
              value={form.interests}
              onChange={(e) => setField("interests", e.target.value)}
              placeholder="长跑、画画"
            />
          </div>
          <div className="form-group">
            <label>当前状态</label>
            <input
              value={form.current_status}
              onChange={(e) => setField("current_status", e.target.value)}
              placeholder="学习中"
            />
          </div>
        </div>
      </section>

      {/* Hero 区 */}
      <section className="wb-card">
        <h3>🪧 Hero 区</h3>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Kicker</label>
            <input
              value={form.kicker}
              onChange={(e) => setField("kicker", e.target.value)}
              placeholder="About Me"
            />
          </div>
          <div className="form-group">
            <label>标题</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="你好，我是沉积"
            />
          </div>
        </div>
        <div className="form-group">
          <label>副标题</label>
          <input
            value={form.subtitle}
            onChange={(e) => setField("subtitle", e.target.value)}
            placeholder="浙江大学 25 级本科生，准大二。"
          />
        </div>
        <div className="form-group">
          <label>描述</label>
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="我喜欢长跑和画画，也在慢慢学习编程、前端、数据分析和 AI 工具。"
          />
        </div>
      </section>

      {/* 兴趣习惯 */}
      <section className="wb-card">
        <h3>🎯 兴趣与习惯</h3>
        {form.hobby_cards.map((h, i) => (
          <div className="about-admin-row" key={i}>
            <input
              className="about-admin-icon"
              value={h.icon}
              onChange={(e) => setRowField("hobby_cards", i, "icon", e.target.value)}
              placeholder="图标（如 🏃）"
            />
            <input
              value={h.title}
              onChange={(e) => setRowField("hobby_cards", i, "title", e.target.value)}
              placeholder="标题（如 长跑）"
            />
            <input
              value={h.desc}
              onChange={(e) => setRowField("hobby_cards", i, "desc", e.target.value)}
              placeholder="一句说明"
            />
            <button
              type="button"
              className="about-admin-remove"
              onClick={() => removeRow("hobby_cards", i)}
              title="删除这一项"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm about-admin-add"
          onClick={() => addRow("hobby_cards", { icon: "", title: "", desc: "" })}
        >
          + 添加兴趣
        </button>
      </section>

      {/* 正在学习 */}
      <section className="wb-card">
        <h3>📚 正在学习</h3>
        {form.learning_items.map((s, i) => (
          <div className="about-admin-row" key={i}>
            <input
              className="about-admin-name"
              value={s.name}
              onChange={(e) => setRowField("learning_items", i, "name", e.target.value)}
              placeholder="技能名（如 Python）"
            />
            <input
              value={s.desc}
              onChange={(e) => setRowField("learning_items", i, "desc", e.target.value)}
              placeholder="一句新手向说明"
            />
            <button
              type="button"
              className="about-admin-remove"
              onClick={() => removeRow("learning_items", i)}
              title="删除这一项"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm about-admin-add"
          onClick={() => addRow("learning_items", { name: "", desc: "" })}
        >
          + 添加学习项
        </button>
      </section>

      {/* 网站说明 */}
      <section className="wb-card">
        <h3>💻 网站说明</h3>
        <div className="form-group">
          <label>这个网站是什么</label>
          <textarea
            rows="3"
            value={form.site_desc}
            onChange={(e) => setField("site_desc", e.target.value)}
            placeholder="沉积 Learning Hub 是我的个人学习工作台……"
          />
        </div>
        <div className="form-group">
          <label>网站用途（前台基本信息卡展示）</label>
          {form.site_usage.map((u, i) => (
            <div className="about-admin-row" key={i}>
              <input
                value={u}
                onChange={(e) => setStrRow("site_usage", i, e.target.value)}
                placeholder="如 记录学习过程"
              />
              <button
                type="button"
                className="about-admin-remove"
                onClick={() => removeRow("site_usage", i)}
                title="删除这一项"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm about-admin-add"
            onClick={() => addRow("site_usage", "")}
          >
            + 添加用途
          </button>
        </div>
      </section>

      {/* 目标列表 */}
      <section className="wb-card">
        <h3>🌱 目前想做的事</h3>
        {form.goal_items.map((g, i) => (
          <div className="about-admin-row" key={i}>
            <input
              value={g}
              onChange={(e) => setStrRow("goal_items", i, e.target.value)}
              placeholder="一条小目标"
            />
            <button
              type="button"
              className="about-admin-remove"
              onClick={() => removeRow("goal_items", i)}
              title="删除这一项"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm about-admin-add"
          onClick={() => addRow("goal_items", "")}
        >
          + 添加目标
        </button>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "保存中…" : "💾 保存"}
        </button>
        <button type="button" className="btn" onClick={reset}>
          ↺ 恢复默认
        </button>
        <button type="button" className="btn" onClick={clear}>
          🧹 清空表单
        </button>
        <button type="button" className="btn" onClick={preview}>
          👀 预览前台
        </button>
      </div>
    </div>
  );
}
