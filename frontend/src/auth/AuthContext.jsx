// Authentication state shared across the app: the current user, plus login / register /
// logout actions. The bearer token lives in localStorage (see api/client) so a refresh
// keeps you signed in; on mount we validate it with GET /api/auth/me.
import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client";
import { AuthContext } from "./context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Loading only while we validate a stored token; with no token there's nothing to check.
  const [loading, setLoading] = useState(() => !!api.getToken());

  useEffect(() => {
    if (!api.getToken()) return undefined;
    let active = true;
    api
      .getMe()
      .then((u) => active && setUser(u))
      .catch(() => api.clearToken())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(async (form) => {
    const { token, user: u } = await api.register(form);
    api.setToken(token);
    setUser(u);
  }, []);

  const login = useCallback(async (form) => {
    const { token, user: u } = await api.login(form);
    api.setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      api.clearToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
