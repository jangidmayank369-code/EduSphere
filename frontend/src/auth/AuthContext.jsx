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
  verifyMFALogin,
} from "../api/auth";

const AuthContext = createContext(null);

const TOKEN_KEY = "edusphere_access_token";

const DEFAULT_SESSION_MINUTES = 60;
const SESSION_WARNING_SECONDS = 5 * 60;

function extractUser(response) {
  return response?.data ?? response;
}

/**
 * Decode the JWT payload without verifying it.
 *
 * Verification is performed by the backend.
 * The frontend only uses the `exp` claim to display the
 * remaining session time and automatically clear an expired token.
 */
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map(
          (char) =>
            `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`,
        )
        .join(""),
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTokenExpiry(token) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return null;
  }

  const expiry = Number(payload.exp) * 1000;

  if (!Number.isFinite(expiry) || expiry <= 0) {
    return null;
  }

  return expiry;
}

function normalizePermissionCode(permission) {
  if (!permission) {
    return null;
  }

  if (typeof permission === "string") {
    return permission.trim();
  }

  if (typeof permission === "object") {
    return (
      permission.code ??
      permission.name ??
      permission.permission_code ??
      null
    );
  }

  return null;
}

function normalizeRoleName(role) {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return role.trim();
  }

  if (typeof role === "object") {
    return (
      role.name ??
      role.code ??
      role.role_name ??
      null
    );
  }

  return null;
}

function getUserPermissionCodes(currentUser) {
  if (!currentUser) {
    return new Set();
  }

  const codes = new Set();

  // Direct user permissions
  const directPermissions = Array.isArray(
    currentUser.permissions,
  )
    ? currentUser.permissions
    : [];

  for (const permission of directPermissions) {
    const code = normalizePermissionCode(permission);

    if (code) {
      codes.add(code);
    }
  }

  // Permissions attached to roles
  const roles = Array.isArray(currentUser.roles)
    ? currentUser.roles
    : [];

  for (const role of roles) {
    const rolePermissions = Array.isArray(
      role?.permissions,
    )
      ? role.permissions
      : [];

    for (const permission of rolePermissions) {
      const code = normalizePermissionCode(permission);

      if (code) {
        codes.add(code);
      }
    }
  }

  return codes;
}

function getUserRoleNames(currentUser) {
  if (!currentUser) {
    return new Set();
  }

  const roles = Array.isArray(currentUser.roles)
    ? currentUser.roles
    : [];

  const roleNames = new Set();

  for (const role of roles) {
    const name = normalizeRoleName(role);

    if (name) {
      roleNames.add(name.toLowerCase());
    }
  }

  // Some APIs may return a single role instead of roles[]
  if (currentUser.role) {
    const name = normalizeRoleName(currentUser.role);

    if (name) {
      roleNames.add(name.toLowerCase());
    }
  }

  return roleNames;
}

function isAdministrator(currentUser) {
  const roleNames = getUserRoleNames(currentUser);

  return (
    roleNames.has("admin") ||
    roleNames.has("administrator") ||
    roleNames.has("super admin") ||
    roleNames.has("super_admin") ||
    roleNames.has("superadmin")
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sessionExpiresAt, setSessionExpiresAt] =
    useState(null);

  const [sessionRemainingSeconds, setSessionRemainingSeconds] =
    useState(null);

  // ---------------------------------------------------------
  // MFA LOGIN STATE
  // ---------------------------------------------------------
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] =
    useState(null);

  /**
   * Update session information from the current JWT.
   */
  const updateSessionFromToken = useCallback((token) => {
    if (!token) {
      setSessionExpiresAt(null);
      setSessionRemainingSeconds(null);
      return;
    }

    const expiry = getTokenExpiry(token);

    if (!expiry) {
      // Backend token may not expose a readable expiry.
      // Keep a sensible display value without blocking auth.
      const fallbackExpiry =
        Date.now() +
        DEFAULT_SESSION_MINUTES * 60 * 1000;

      setSessionExpiresAt(fallbackExpiry);
      setSessionRemainingSeconds(
        DEFAULT_SESSION_MINUTES * 60,
      );

      return;
    }

    const remaining = Math.max(
      0,
      Math.ceil((expiry - Date.now()) / 1000),
    );

    setSessionExpiresAt(expiry);
    setSessionRemainingSeconds(remaining);
  }, []);

  /**
   * Clear local authentication state.
   */
  const clearAuthentication = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);

    setUser(null);
    setSessionExpiresAt(null);
    setSessionRemainingSeconds(null);

    // Clear MFA challenge state as well.
    setMfaRequired(false);
    setMfaChallengeToken(null);
  }, []);

  /**
   * Load currently authenticated user.
   */
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      clearAuthentication();
      setLoading(false);
      return null;
    }

    const expiry = getTokenExpiry(token);

    if (expiry && expiry <= Date.now()) {
      clearAuthentication();
      setLoading(false);
      return null;
    }

    updateSessionFromToken(token);

    try {
      const response = await getCurrentUser();
      const currentUser = extractUser(response);

      if (!currentUser) {
        throw new Error(
          "Unable to load current user.",
        );
      }

      setUser(currentUser);

      return currentUser;
    } catch {
      clearAuthentication();
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    clearAuthentication,
    updateSessionFromToken,
  ]);

  /**
   * Initial authentication bootstrap.
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (mounted) {
          setUser(null);
          setSessionExpiresAt(null);
          setSessionRemainingSeconds(null);
          setMfaRequired(false);
          setMfaChallengeToken(null);
          setLoading(false);
        }

        return;
      }

      const expiry = getTokenExpiry(token);

      if (expiry && expiry <= Date.now()) {
        localStorage.removeItem(TOKEN_KEY);

        if (mounted) {
          setUser(null);
          setSessionExpiresAt(null);
          setSessionRemainingSeconds(null);
          setMfaRequired(false);
          setMfaChallengeToken(null);
          setLoading(false);
        }

        return;
      }

      if (mounted) {
        updateSessionFromToken(token);
      }

      try {
        const response = await getCurrentUser();
        const currentUser = extractUser(response);

        if (mounted) {
          setUser(currentUser || null);
          setMfaRequired(false);
          setMfaChallengeToken(null);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);

        if (mounted) {
          setUser(null);
          setSessionExpiresAt(null);
          setSessionRemainingSeconds(null);
          setMfaRequired(false);
          setMfaChallengeToken(null);
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
  }, [updateSessionFromToken]);

  /**
   * Login.
   *
   * Normal login:
   *   email/password -> access token -> current user
   *
   * MFA login:
   *   email/password -> MFA challenge token
   *   -> UI asks for OTP/recovery code
   */
  const login = useCallback(
    async (email, password) => {
      const response = await loginRequest(
        email,
        password,
      );

      // -------------------------------------------------------
      // MFA REQUIRED
      // -------------------------------------------------------
      if (response?.mfa_required) {
        const challengeToken =
          response?.mfa_challenge_token ||
          response?.data?.mfa_challenge_token;

        if (!challengeToken) {
          throw new Error(
            "Login requires MFA, but the server did not return a challenge token.",
          );
        }

        // Make sure an old authenticated state cannot survive
        // while MFA verification is pending.
        localStorage.removeItem(TOKEN_KEY);

        setUser(null);
        setSessionExpiresAt(null);
        setSessionRemainingSeconds(null);

        setMfaRequired(true);
        setMfaChallengeToken(challengeToken);

        return {
          mfaRequired: true,
          mfaChallengeToken: challengeToken,
          expiresAt:
            response?.expires_at ??
            response?.data?.expires_at ??
            null,
        };
      }

      // -------------------------------------------------------
      // NORMAL LOGIN / MFA ALREADY VERIFIED
      // -------------------------------------------------------
      const token =
        response?.access_token ||
        response?.data?.access_token;

      if (!token) {
        throw new Error(
          "Login failed: server did not return an access token.",
        );
      }

      localStorage.setItem(TOKEN_KEY, token);

      setMfaRequired(false);
      setMfaChallengeToken(null);

      updateSessionFromToken(token);

      try {
        const currentUserResponse =
          await getCurrentUser();

        const currentUser = extractUser(
          currentUserResponse,
        );

        if (!currentUser) {
          throw new Error(
            "Unable to load logged-in user.",
          );
        }

        setUser(currentUser);

        return currentUser;
      } catch (error) {
        clearAuthentication();
        throw error;
      }
    },
    [
      clearAuthentication,
      updateSessionFromToken,
    ],
  );

  /**
   * Complete MFA login.
   *
   * challenge token + OTP OR recovery code
   * -> access token -> current user
   */
  const verifyMFA = useCallback(
    async ({
      challengeToken,
      otpCode = null,
      recoveryCode = null,
      emailOtpCode = null,
    }) => {
      const token =
        challengeToken || mfaChallengeToken;

      if (!token) {
        throw new Error(
          "MFA challenge is missing or has expired.",
        );
      }

      const hasOtp = Boolean(otpCode);
      const hasRecoveryCode = Boolean(recoveryCode);
      const hasEmailOtp = Boolean(emailOtpCode);

      // Exactly one MFA method must be supplied.
      // Email OTP is a first-class MFA method alongside
      // Authenticator OTP and Recovery Code.
      const suppliedMethods = [
        hasOtp,
        hasRecoveryCode,
        hasEmailOtp,
      ].filter(Boolean).length;

      if (suppliedMethods !== 1) {
        throw new Error(
          "Provide exactly one of Authenticator OTP, recovery code, or email OTP.",
        );
      }

      const response = await verifyMFALogin(
        token,
        {
          otpCode,
          recoveryCode,
          emailOtpCode,
        },
      );

      const accessToken =
        response?.access_token ||
        response?.data?.access_token;

      if (!accessToken) {
        throw new Error(
          "MFA verification failed: server did not return an access token.",
        );
      }

      // MFA verification is complete.
      // Store the real access token only now.
      localStorage.setItem(
        TOKEN_KEY,
        accessToken,
      );

      setMfaRequired(false);
      setMfaChallengeToken(null);

      updateSessionFromToken(accessToken);

      try {
        const currentUserResponse =
          await getCurrentUser();

        const currentUser = extractUser(
          currentUserResponse,
        );

        if (!currentUser) {
          throw new Error(
            "Unable to load logged-in user after MFA verification.",
          );
        }

        setUser(currentUser);

        return currentUser;
      } catch (error) {
        clearAuthentication();
        throw error;
      }
    },
    [
      clearAuthentication,
      mfaChallengeToken,
      updateSessionFromToken,
    ],
  );

  /**
   * Cancel an MFA login challenge.
   */
  const cancelMFA = useCallback(() => {
    setMfaRequired(false);
    setMfaChallengeToken(null);
    setUser(null);
    setSessionExpiresAt(null);
    setSessionRemainingSeconds(null);

    localStorage.removeItem(TOKEN_KEY);
  }, []);

  /**
   * Logout.
   *
   * Local token removal is intentional here.
   * Backend session revocation can be handled separately
   * by the security/session API.
   */
  const logout = useCallback(() => {
    clearAuthentication();
  }, [clearAuthentication]);

  /**
   * ---------------------------------------------------------
   * RBAC
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * This is a FUNCTION DECLARATION rather than
   * `const hasPermission = ...`.
   *
   * That prevents the:
   *
   * Cannot access 'hasPermission' before initialization
   *
   * error that occurred previously.
   */
  function hasPermission(permissionCode) {
    if (!permissionCode) {
      return true;
    }

    if (!user) {
      return false;
    }

    const normalizedCode =
      String(permissionCode).trim();

    if (!normalizedCode) {
      return true;
    }

    const permissionCodes =
      getUserPermissionCodes(user);

    // Exact permission match.
    if (permissionCodes.has(normalizedCode)) {
      return true;
    }

    // Administrator fallback.
    //
    // Backend RBAC remains the actual security boundary.
    // This only keeps the frontend navigation usable for
    // administrator accounts when permission details are
    // not included in the /auth/me response.
    if (isAdministrator(user)) {
      return true;
    }

    return false;
  }

  /**
   * Check whether the current user has at least one
   * permission from a supplied list.
   */
  function hasAnyPermission(permissionCodes) {
    if (!Array.isArray(permissionCodes)) {
      return false;
    }

    return permissionCodes.some((code) =>
      hasPermission(code),
    );
  }

  /**
   * Check user role.
   */
  function hasRole(roleName) {
    if (!roleName || !user) {
      return false;
    }

    const roleNames = getUserRoleNames(user);

    return roleNames.has(
      String(roleName).trim().toLowerCase(),
    );
  }

  /**
   * Keep session countdown synchronized with JWT expiry.
   */
  useEffect(() => {
    if (!sessionExpiresAt) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (sessionExpiresAt - Date.now()) / 1000,
        ),
      );

      setSessionRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearAuthentication();
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    sessionExpiresAt,
    clearAuthentication,
  ]);

  /**
   * If another browser tab logs out, synchronize this tab.
   */
  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== TOKEN_KEY) {
        return;
      }

      if (!event.newValue) {
        setUser(null);
        setSessionExpiresAt(null);
        setSessionRemainingSeconds(null);
        setMfaRequired(false);
        setMfaChallengeToken(null);
        return;
      }

      updateSessionFromToken(event.newValue);
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, [updateSessionFromToken]);

  /**
   * Human-friendly session status.
   */
  const sessionWarning =
    sessionRemainingSeconds !== null &&
    sessionRemainingSeconds > 0 &&
    sessionRemainingSeconds <=
      SESSION_WARNING_SECONDS;

  /**
   * Format remaining session time.
   */
  const sessionRemainingText = useMemo(() => {
    if (
      sessionRemainingSeconds === null ||
      sessionRemainingSeconds < 0
    ) {
      return null;
    }

    const totalSeconds =
      Math.max(0, sessionRemainingSeconds);

    const hours = Math.floor(
      totalSeconds / 3600,
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60,
    );

    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(
        minutes,
      ).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0",
      )}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }, [sessionRemainingSeconds]);

  /**
   * Context value.
   */
  const value = useMemo(
    () => ({
      user,

      loading,

      isAuthenticated: Boolean(user),

      login,

      logout,

      loadUser,

      // MFA
      mfaRequired,
      mfaChallengeToken,
      verifyMFA,
      cancelMFA,

      // RBAC
      hasPermission,
      hasAnyPermission,
      hasRole,

      // Session
      sessionExpiresAt,
      sessionRemainingSeconds,
      sessionRemainingText,
      sessionWarning,
    }),
    [
      user,
      loading,
      login,
      logout,
      loadUser,
      mfaRequired,
      mfaChallengeToken,
      verifyMFA,
      cancelMFA,
      sessionExpiresAt,
      sessionRemainingSeconds,
      sessionRemainingText,
      sessionWarning,
    ],
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