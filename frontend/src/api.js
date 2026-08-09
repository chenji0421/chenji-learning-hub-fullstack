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
    throw new Error(msg);
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
};
