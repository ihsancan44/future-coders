import axios from "axios";

const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "fc_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token, remember = true) => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* depolama kapalıysa oturum sadece bu sekmede kalır */
    }
  },
  /** Anahtarı yenilerken kullanıcının "beni hatırla" seçimini korur (aynı depoya yazar). */
  replace: (token) => {
    try {
      const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
      store.setItem(TOKEN_KEY, token);
    } catch {
      /* yok say */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* yok say */
    }
  },
};

export const api = axios.create({ baseURL: `${base}/api` });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && tokenStore.get()) onUnauthorized?.();
    return Promise.reject(err);
  },
);

/** API hatasını kullanıcıya gösterilecek mesaja ve alan hatalarına çevirir. */
export function apiError(err) {
  if (!err?.response) {
    return { message: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.", fields: {}, code: null, status: 0 };
  }
  const { data, status } = err.response;
  return { message: data?.error || "Beklenmeyen bir hata oluştu.", fields: data?.fields || {}, code: data?.code || null, status };
}

/** /uploads/... gibi göreli görsel yollarını tam adrese çevirir. */
export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path}`;
}
