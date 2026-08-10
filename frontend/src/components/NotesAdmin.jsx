import { useEffect, useState } from "react";
import { api } from "../api.js";

// 管理后台「学习笔记」标签页：分区管理 + 笔记管理 + PDF 上传。
// 只允许 PDF；删除前 confirm；保存成功 / 失败都有提示。
const EMPTY_SECTION = {
  name: "",
  description: "",
  parent_id: "",
  sort_order: "0",
  is_public: true,
};
const EMPTY_ITEM = {
  title: "",
  description: "",
  section_id: "",
  tagsInput: "",
  is_public: true,
  file: null,
};

const parseTags = (s) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const fmtSize = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export default function NotesAdmin() {
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [editingSection, setEditingSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const refresh = () => {
    api.listNoteSections().then(setSections).catch(() => {});
    api.listNoteItems().then(setItems).catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), type === "error" ? 5000 : 2500);
  };

  // ---------- 分区操作 ----------
  const resetSectionForm = () => {
    setSectionForm(EMPTY_SECTION);
    setEditingSection(null);
  };

  const submitSection = async () => {
    if (!sectionForm.name.trim()) {
      showMsg("分区名称不能为空", "error");
      return;
    }
    const payload = {
      name: sectionForm.name,
      description: sectionForm.description,
      parent_id: sectionForm.parent_id ? Number(sectionForm.parent_id) : null,
      sort_order: Number(sectionForm.sort_order) || 0,
      is_public: sectionForm.is_public,
    };
    try {
      if (editingSection) {
        await api.updateNoteSection(editingSection.id, payload);
        showMsg("分区已更新");
      } else {
        await api.createNoteSection(payload);
        showMsg("分区已创建");
      }
      resetSectionForm();
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const editSection = (s) => {
    setEditingItem(null);
    setEditingSection(s);
    setSectionForm({
      name: s.name,
      description: s.description,
      parent_id: s.parent_id || "",
      sort_order: String(s.sort_order ?? 0),
      is_public: s.is_public,
    });
  };

  const deleteSection = async (id) => {
    if (!window.confirm("确定删除这个分区？它的子分区和所有笔记（含 PDF）会一并删除。")) return;
    try {
      await api.deleteNoteSection(id);
      showMsg("分区已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // ---------- 笔记操作 ----------
  const resetItemForm = () => {
    setItemForm(EMPTY_ITEM);
    setEditingItem(null);
  };

  const submitItem = async () => {
    if (!itemForm.title.trim()) {
      showMsg("笔记标题不能为空", "error");
      return;
    }
    if (!itemForm.section_id) {
      showMsg("请选择所属分区", "error");
      return;
    }
    const fields = {
      title: itemForm.title,
      description: itemForm.description,
      section_id: Number(itemForm.section_id),
      tags: parseTags(itemForm.tagsInput),
      is_public: itemForm.is_public,
    };
    try {
      if (editingItem) {
        await api.updateNoteItem(editingItem.id, fields);
        if (itemForm.file) await api.uploadNoteFile(editingItem.id, itemForm.file);
        showMsg(itemForm.file ? "笔记已更新并替换 PDF" : "笔记已更新");
      } else {
        if (itemForm.file) {
          await api.uploadNoteItem(fields, itemForm.file);
        } else {
          await api.createNoteItem(fields);
        }
        showMsg("笔记已创建");
      }
      resetItemForm();
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const editItem = (it) => {
    setEditingSection(null);
    setEditingItem(it);
    setItemForm({
      title: it.title,
      description: it.description,
      section_id: it.section_id || "",
      tagsInput: (it.tags || []).join(", "),
      is_public: it.is_public,
      file: null,
    });
  };

  const deleteItem = async (id) => {
    if (!window.confirm("确定删除这条笔记？PDF 文件会一并删除。")) return;
    try {
      await api.deleteNoteItem(id);
      showMsg("笔记已删除");
      refresh();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // ---------- 分区树：大分区在前，子分区缩进 ----------
  const roots = sections.filter((s) => !s.parent_id);
  const childrenOf = (id) => sections.filter((s) => s.parent_id === id);

  return (
    <div className="notes-admin">
      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      <div className="wb-grid">
        {/* ===== 分区管理 ===== */}
        <section className="wb-card">
          <h2>{editingSection ? "✏️ 编辑分区" : "🗂️ 分区管理"}</h2>
          <div className="form-group">
            <label>名称</label>
            <input
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              placeholder="如：数学 / 高等数学"
            />
          </div>
          <div className="form-group">
            <label>说明</label>
            <input
              value={sectionForm.description}
              onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
              placeholder="这个分区放什么（可选）"
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>父分区</label>
              <select
                value={sectionForm.parent_id}
                onChange={(e) => setSectionForm({ ...sectionForm, parent_id: e.target.value })}
              >
                <option value="">（无，作为大分区）</option>
                {roots
                  .filter((r) => r.id !== editingSection?.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
              <span className="label-hint">选了大分区后，这里就是它的子分区</span>
            </div>
            <div className="form-group">
              <label>排序</label>
              <input
                type="number"
                value={sectionForm.sort_order}
                onChange={(e) => setSectionForm({ ...sectionForm, sort_order: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={sectionForm.is_public}
                onChange={(e) => setSectionForm({ ...sectionForm, is_public: e.target.checked })}
              />
              公开分区（访客可见）
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={submitSection}>
              {editingSection ? "保存修改" : "新建分区"}
            </button>
            {(editingSection || editingItem) && (
              <button type="button" className="btn" onClick={() => { resetSectionForm(); resetItemForm(); }}>
                取消编辑
              </button>
            )}
          </div>

          <h3 style={{ marginTop: 20 }}>分区列表（{sections.length}）</h3>
          {sections.length === 0 ? (
            <p className="muted">还没有分区，先建一个大分区吧。</p>
          ) : (
            <ul className="admin-list">
              {roots.map((root) => (
                <li key={root.id}>
                  <span className="admin-item">
                    <span className="badge badge-pub">分区</span>
                    <span className="admin-item-title">📁 {root.name}</span>
                    {!root.is_public && <span className="muted">· 🔒 私密</span>}
                  </span>
                  <span className="admin-actions">
                    <button onClick={() => editSection(root)}>编辑</button>
                    <button className="danger" onClick={() => deleteSection(root.id)}>
                      删除
                    </button>
                  </span>
                  {childrenOf(root.id).length > 0 && (
                    <ul className="admin-list" style={{ marginTop: 6 }}>
                      {childrenOf(root.id).map((child) => (
                        <li key={child.id}>
                          <span className="admin-item">
                            <span className="badge badge-draft">子分区</span>
                            <span className="admin-item-title">🗂️ {child.name}</span>
                            {!child.is_public && <span className="muted">· 🔒 私密</span>}
                          </span>
                          <span className="admin-actions">
                            <button onClick={() => editSection(child)}>编辑</button>
                            <button className="danger" onClick={() => deleteSection(child.id)}>
                              删除
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ===== 笔记管理 ===== */}
        <section className="wb-card">
          <h2>{editingItem ? "✏️ 编辑笔记" : "📄 笔记管理"}</h2>
          <div className="form-group">
            <label>标题</label>
            <input
              value={itemForm.title}
              onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
              placeholder="如：极限与连续"
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>所属分区</label>
              <select
                value={itemForm.section_id}
                onChange={(e) => setItemForm({ ...itemForm, section_id: e.target.value })}
              >
                <option value="">请选择分区</option>
                {roots.map((r) => (
                  <optgroup key={r.id} label={`📁 ${r.name}`}>
                    {childrenOf(r.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        └ {c.name}
                      </option>
                    ))}
                    {childrenOf(r.id).length === 0 && (
                      <option value={r.id}>{r.name}</option>
                    )}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>标签（逗号分隔）</label>
              <input
                value={itemForm.tagsInput}
                onChange={(e) => setItemForm({ ...itemForm, tagsInput: e.target.value })}
                placeholder="高等数学, 极限"
              />
            </div>
          </div>
          <div className="form-group">
            <label>简介</label>
            <input
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="这条笔记讲什么（可选）"
            />
          </div>
          <div className="form-group">
            <label>PDF 文件（只支持 .pdf）</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setItemForm({ ...itemForm, file: e.target.files?.[0] || null })}
            />
            <span className="label-hint">
              {editingItem
                ? "选择新文件会替换原 PDF；不选则保持原文件"
                : "新建时选文件会一并保存；不选可先建笔记稍后上传"}
            </span>
          </div>
          <div className="form-group">
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={itemForm.is_public}
                onChange={(e) => setItemForm({ ...itemForm, is_public: e.target.checked })}
              />
              公开笔记（访客可查看 / 下载）
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={submitItem}>
              {editingItem ? "保存修改" : "保存笔记"}
            </button>
            {(editingItem || editingSection) && (
              <button type="button" className="btn" onClick={() => { resetItemForm(); resetSectionForm(); }}>
                取消编辑
              </button>
            )}
          </div>

          <h3 style={{ marginTop: 20 }}>笔记列表（{items.length}）</h3>
          {items.length === 0 ? (
            <p className="muted">还没有笔记，先建分区再上传 PDF。</p>
          ) : (
            <ul className="admin-list">
              {items.map((it) => (
                <li key={it.id}>
                  <span className="admin-item">
                    <span className="badge badge-pub">PDF</span>
                    <span className="admin-item-title">{it.title}</span>
                    {!it.is_public && <span className="muted">· 🔒</span>}
                    {it.file_name && (
                      <span className="muted">
                        {" "}
                        · {it.file_name}
                        {it.file_size ? ` (${fmtSize(it.file_size)})` : ""}
                      </span>
                    )}
                  </span>
                  <span className="admin-actions">
                    {it.file_name && (
                      <a href={api.noteFileUrl(it.id)} target="_blank" rel="noreferrer">
                        查看
                      </a>
                    )}
                    <button onClick={() => editItem(it)}>编辑</button>
                    <button className="danger" onClick={() => deleteItem(it.id)}>
                      删除
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
