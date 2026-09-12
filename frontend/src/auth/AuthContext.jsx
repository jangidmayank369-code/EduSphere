import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
} from "../api/auth";

const AuthContext = createContext(null);

const TOKEN_KEY = "edusphere_access_token";

function extractUser(response) {
  return response?.data ?? response;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await getCurrentUser();
      const currentUser = extractUser(response);

      if (!currentUser) {
        throw new Error("Unable to load current user.");
      }

      setUser(currentUser);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getCurrentUser();
        const currentUser = extractUser(response);

        if (mounted) {
          setUser(currentUser || null);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await loginRequest(email, password);

    const token =
      response?.access_token ||
      response?.data?.access_token;

    if (!token) {
      throw new Error(
        "Login failed: server did not return an access token.",
      );
    }

    localStorage.setItem(TOKEN_KEY, token);

    try {
      const currentUserResponse = await getCurrentUser();
      const currentUser = extractUser(currentUserResponse);

      if (!currentUser) {
        throw new Error("Unable to load logged-in user.");
      }

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      loadUser,
    }),
    [user, loading, login, logout, loadUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}