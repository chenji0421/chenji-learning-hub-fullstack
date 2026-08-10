// 与后端通信的统一封装：管理 token、处理错误、集中暴露 API 方法。
// 开发时用 Vite 代理（/api -> localhost:8000），无需配 VITE_API_URL；
// 部署时如果前后端不同域，再通过 VITE_API_URL 指定后端地址。

const API_BASE = import.meta.env.VITE_API_URL || "";

export const TOKEN_KEY = "chl_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string" ? detail : detail?.[0]?.msg || `请求失败（${res.status}）`;
    const err = new Error(msg);
    err.status = res.status; // 附带状态码，调用方可区分 401 过期 vs 网络错误
    throw err;
  }
  return data;
}

// multipart 上传专用：不手动设 Content-Type，让浏览器自动带 boundary
async function requestForm(path, { method = "POST", body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method, body, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string" ? detail : detail?.[0]?.msg || `请求失败（${res.status}）`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // 健康检查
  health: () => request("/api/health"),

  // 认证
  loginUrl: async () => {
    const data = await request("/api/auth/github/start");
    return data.authorize_url;
  },
  me: () => request("/api/auth/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),

  // 文章（访客只读 published；写操作在 /api/admin/articles，需管理员）
  listArticles: () => request("/api/articles"),
  getArticle: (id) => request(`/api/articles/${id}`),
  createArticle: (payload) =>
    request("/api/admin/articles", { method: "POST", body: JSON.stringify(payload) }),
  updateArticle: (id, payload) =>
    request(`/api/admin/articles/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteArticle: (id) => request(`/api/admin/articles/${id}`, { method: "DELETE" }),

  // 计划（访客只读；写操作在 /api/admin/plans，按日期定位，需管理员）
  listPlans: () => request("/api/plans"),
  getPlan: (date) => request(`/api/plans/${date}`),
  createPlan: (payload) =>
    request("/api/admin/plans", { method: "POST", body: JSON.stringify(payload) }),
  updatePlan: (date, payload) =>
    request(`/api/admin/plans/${date}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePlan: (date) => request(`/api/admin/plans/${date}`, { method: "DELETE" }),

  // 学习笔记（访客只读公开；写操作在 /api/admin/notes，需管理员）
  listNoteSections: () => request("/api/notes/sections"),
  listNoteItems: (sectionId) =>
    request(sectionId ? `/api/notes/items?section_id=${sectionId}` : "/api/notes/items"),
  getNoteItem: (id) => request(`/api/notes/items/${id}`),
  // PDF 文件地址（新标签页打开或下载）
  noteFileUrl: (id) => `${API_BASE}/api/notes/items/${id}/file`,
  // 分区管理（管理员）
  createNoteSection: (payload) =>
    request("/api/admin/notes/sections", { method: "POST", body: JSON.stringify(payload) }),
  updateNoteSection: (id, payload) =>
    request(`/api/admin/notes/sections/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNoteSection: (id) =>
    request(`/api/admin/notes/sections/${id}`, { method: "DELETE" }),
  // 笔记管理（管理员）
  createNoteItem: (payload) =>
    request("/api/admin/notes/items", { method: "POST", body: JSON.stringify(payload) }),
  updateNoteItem: (id, payload) =>
    request(`/api/admin/notes/items/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNoteItem: (id) =>
    request(`/api/admin/notes/items/${id}`, { method: "DELETE" }),
  // PDF 上传：创建笔记 + 上传文件一步完成
  uploadNoteItem: (fields, file) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    if (file) fd.append("file", file);
    return requestForm("/api/admin/notes/items/upload", { method: "POST", body: fd });
  },
  // 给已存在的笔记绑定 / 替换 PDF
  uploadNoteFile: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestForm(`/api/admin/notes/items/${id}/upload`, { method: "POST", body: fd });
  },
};
