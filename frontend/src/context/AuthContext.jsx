import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { api, setUnauthorizedHandler, tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      // Sadece oturum geçersizse (401) çıkış yapılır; sunucu kapalıyken ya da internet yokken "beni hatırla" silinmez.
      .catch((err) => {
        if (err.response?.status === 401) tokenStore.clear();
        else setOffline(true);
      })
      .finally(() => setReady(true));
  }, [logout]);

  // Sekmeye dönüldüğünde kullanıcı bilgisi tazelenir: admin sınıfı değiştirdiyse menü ve kurslar hemen güncellenir.
  useEffect(() => {
    if (!user) return undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible" || !tokenStore.get()) return;
      api.get("/auth/me").then((res) => setUser(res.data.user)).catch(() => {});
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [user]);

  const login = useCallback(async ({ email, password, remember }) => {
    const res = await api.post("/auth/login", { email, password });
    tokenStore.set(res.data.token, remember);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post("/auth/register", data);
    tokenStore.set(res.data.token, true);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(
    () => ({ user, ready, offline, login, register, logout, setUser, isAdmin: user?.role === "ADMIN" }),
    [user, ready, offline, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node };

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}
