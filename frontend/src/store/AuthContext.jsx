import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'bookiops_admin_token';
const USER_KEY = 'bookiops_admin_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [booting, setBooting] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      isAuthenticated: !!token && !!user,
      async login(email, password) {
        const data = await api.login(email, password);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
      },
      async logout() {
        try {
          if (token) await api.logout(token);
        } catch {
          /* ignore */
        }
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
