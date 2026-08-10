import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// 学习笔记库：按「大分区 → 子分区 → 笔记条目」组织 iPad 手写 PDF 笔记。
// 数据全部来自后端真实接口，没有笔记时显示空状态，不生成假数据。
export default function Notes({ user }) {
  const [data, setData] = useState(null); // { sections, items }
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("all"); // "all" 或分区 id

  useEffect(() => {
    let alive = true;
    Promise.all([api.listNoteSections(), api.listNoteItems()])
      .then(([sections, items]) => {
        if (alive) setData({ sections: sections || [], items: items || [] });
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setData({ sections: [], items: [] });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  // 把平铺分区构造成树：parent_id 为空的是大分区，其余挂在对应父分区下
  const tree = useMemo(() => {
    if (!data) return [];
    const byParent = {};
    for (const s of data.sections) {
      const pid = s.parent_id || 0;
      (byParent[pid] ||= []).push(s);
    }
    const attach = (node) => {
      node.children = byParent[node.id] || [];
      node.children.forEach(attach);
    };
    const roots = byParent[0] || [];
    roots.forEach(attach);
    return roots;
  }, [data]);

  // 收集一个分区及其所有子分区的 id，用于过滤笔记
  const collectIds = (node, acc = []) => {
    acc.push(node.id);
    (node.children || []).forEach((c) => collectIds(c, acc));
    return acc;
  };

  // 选中分区 → 该分区及其子孙分区的全部笔记
  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (selected === "all") return data.items;
    const node = tree.find((t) => collectIds(t).includes(Number(selected)));
    if (!node) return [];
    const ids = collectIds(node);
    return data.items.filter((it) => ids.includes(it.section_id));
  }, [data, tree, selected]);

  // 每个分区直接归属的笔记数（用于树上的数量角标）
  const countBySection = useMemo(() => {
    const m = {};
    if (data) for (const it of data.items) m[it.section_id] = (m[it.section_id] || 0) + 1;
    return m;
  }, [data]);

  if (error && (!data || data.sections.length === 0)) {
    return (
      <div className="notes page">
        <h1 className="page-title">学习笔记库</h1>
        <p className="page-sub">存放我在 iPad 上手写整理的 PDF 学习笔记，按分区和课程逐步沉淀。</p>
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <h2>学习笔记库还没准备好</h2>
          <p>后端接口暂时不可用（{error}）。管理员可以在管理后台创建分区并上传 PDF。</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="loading">加载中…</div>;

  return (
    <div className="notes page">
      <div className="changelog-head">
        <h1 className="page-title">学习笔记库</h1>
        <p className="page-sub">存放我在 iPad 上手写整理的 PDF 学习笔记，按分区和课程逐步沉淀。</p>
        {user && user.is_admin && (
          <div className="form-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-sm btn-primary" href="#/admin">
              ⚙️ 管理学习笔记
            </a>
          </div>
        )}
      </div>

      {data.sections.length === 0 && data.items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗂️</span>
          <h2>暂无学习笔记</h2>
          <p>管理员登录后可以创建分区并上传 PDF。</p>
        </div>
      ) : (
        <div className="notes-layout">
          {/* 左侧 / 顶部：分类树 */}
          <aside className="notes-tree">
            <button
              type="button"
              className={`notes-tree-item all${selected === "all" ? " active" : ""}`}
              onClick={() => setSelected("all")}
            >
              <span className="notes-tree-name">📂 全部笔记</span>
              <span className="notes-tree-count">{data.items.length}</span>
            </button>
            {tree.map((root) => (
              <TreeBranch
                key={root.id}
                node={root}
                depth={0}
                selected={selected}
                onSelect={setSelected}
                counts={countBySection}
              />
            ))}
          </aside>

          {/* 右侧：笔记列表 */}
          <div className="notes-main">
            <p className="muted results-count">共 {visibleItems.length} 条笔记</p>
            {visibleItems.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📄</span>
                <h2>这个分区还没有笔记</h2>
                <p>等沉积整理好 PDF 笔记就会出现在这里。</p>
              </div>
            ) : (
              <ul className="note-list">
                {visibleItems.map((it) => (
                  <li key={it.id} className="note-card">
                    <div className="note-card-head">
                      <span className="note-file-icon">📄</span>
                      <div className="note-card-title">
                        <span className="note-title">
                          {it.title}
                          {!it.is_public && <span className="note-private">🔒 私密</span>}
                        </span>
                        <span className="note-file-name">{it.file_name || "PDF 文件"}</span>
                      </div>
                    </div>
                    {it.description && <p className="note-desc">{it.description}</p>}
                    <div className="note-card-foot">
                      {it.tags && it.tags.length > 0 && (
                        <div className="friends-tags">
                          {it.tags.map((t, i) => (
                            <span key={i} className="tag">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="article-date">
                        更新于 {new Date(it.updated_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    <div className="form-actions" style={{ marginTop: 10 }}>
                      {it.file_name ? (
                        <>
                          <a
                            className="btn btn-sm btn-primary"
                            href={api.noteFileUrl(it.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            👁️ 查看
                          </a>
                          <a
                            className="btn btn-sm"
                            href={api.noteFileUrl(it.id)}
                            download={it.file_name}
                          >
                            ⬇️ 下载
                          </a>
                        </>
                      ) : (
                        <span className="muted">文件尚未上传</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 递归渲染分区树（大分区 → 子分区），点击选中
function TreeBranch({ node, depth, selected, onSelect, counts }) {
  const isActive = String(node.id) === String(selected);
  return (
    <div className="notes-tree-branch">
      <button
        type="button"
        className={`notes-tree-item${isActive ? " active" : ""}`}
        style={{ paddingLeft: 14 + depth * 18 }}
        onClick={() => onSelect(node.id)}
      >
        <span className="notes-tree-name">
          {depth === 0 ? "📁" : "🗂️"} {node.name}
        </span>
        <span className="notes-tree-count">{counts[node.id] || 0}</span>
      </button>
      {node.children &&
        node.children.map((c) => (
          <TreeBranch
            key={c.id}
            node={c}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
            counts={counts}
          />
        ))}
    </div>
  );
}
