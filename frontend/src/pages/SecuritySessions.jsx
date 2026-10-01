import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSessions,
  logoutAllOtherSessions,
  getMFAStatus,
  setupMFA,
  enableMFA,
  disableMFA,
  regenerateMFARecoveryCodes,
} from "../api/auth";

import { useAuth } from "../auth/AuthContext";


function unwrapSessions(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.sessions)) {
    return payload.sessions;
  }

  return [];
}


function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatRemaining(expiresAt) {
  if (!expiresAt) {
    return "Unknown";
  }

  const expiry = new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) {
    return "Unknown";
  }

  const remaining = expiry - Date.now();

  if (remaining <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(
    remaining / 60000,
  );

  const days = Math.floor(
    totalMinutes / 1440,
  );

  const hours = Math.floor(
    (totalMinutes % 1440) / 60,
  );

  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}


function getDeviceLabel(session) {
  const userAgent =
    session?.user_agent ||
    session?.userAgent ||
    "";

  if (!userAgent) {
    return "Unknown device";
  }

  if (/Windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/Macintosh|Mac OS/i.test(userAgent)) {
    return "macOS";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/iPhone|iPad/i.test(userAgent)) {
    return "iPhone / iPad";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Browser session";
}


function getBrowserLabel(session) {
  const userAgent =
    session?.user_agent ||
    session?.userAgent ||
    "";

  if (!userAgent) {
    return "Browser unavailable";
  }

  if (/Edg\//i.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/Chrome\//i.test(userAgent)) {
    return "Google Chrome";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Mozilla Firefox";
  }

  if (/Safari\//i.test(userAgent) &&
      !/Chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return "Browser";
}


function Icon({ name, size = 19 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    shield: (
      <>
        <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
        <path d="m8.5 12 2.2 2.2L16 9" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.9-4" />
        <path d="M4 4v4h4" />
        <path d="M4 13a8 8 0 0 0 14.9 4" />
        <path d="M20 20v-4h-4" />
      </>
    ),

    monitor: (
      <>
        <rect
          x="3"
          y="4"
          width="18"
          height="13"
          rx="2"
        />
        <path d="M8 21h8M12 17v4" />
      </>
    ),

    clock: (
      <>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M12 7v5l3 2" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {icons[name]}
    </svg>
  );
}


export default function SecuritySessions() {
  const {
    user,
    sessionRemainingSeconds,
  } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // MFA / EMAIL OTP STATE
  // ==========================================================

  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaWorking, setMfaWorking] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");
  const [mfaStatus, setMfaStatus] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaOtp, setMfaOtp] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [disableMethod, setDisableMethod] = useState("otp");
  const [regenerateOtp, setRegenerateOtp] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);


  // ==========================================================
  // LOAD SESSIONS
  // ==========================================================

  const loadSessions = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const payload = await getSessions();

        setSessions(
          unwrapSessions(payload),
        );
      } catch (err) {
        setSessions([]);

        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            "Unable to load security sessions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );


  useEffect(() => {
    loadSessions();
  }, [loadSessions]);



  // ==========================================================
  // MFA / EMAIL OTP
  // ==========================================================

  function getMfaEnabled(payload) {
    return Boolean(
      payload?.enabled ??
        payload?.data?.enabled ??
        payload?.mfa_enabled ??
        payload?.data?.mfa_enabled ??
        false,
    );
  }

  function unwrapMfaPayload(payload) {
    return payload?.data ?? payload;
  }

  function extractRecoveryCodes(payload) {
    const data = unwrapMfaPayload(payload);

    const codes =
      data?.recovery_codes ??
      data?.recoveryCodes ??
      payload?.recovery_codes ??
      payload?.recoveryCodes;

    return Array.isArray(codes) ? codes : [];
  }

  function extractMfaSetup(payload) {
    const data = unwrapMfaPayload(payload);

    return {
      ...data,
      secret:
        data?.secret ??
        data?.secret_key ??
        data?.secretKey ??
        "",
      provisioningUri:
        data?.provisioning_uri ??
        data?.provisioningUri ??
        data?.otpauth_uri ??
        data?.otpAuthUri ??
        "",
      qrCode:
        data?.qr_code ??
        data?.qrCode ??
        data?.qr_code_data_url ??
        data?.qrCodeDataUrl ??
        "",
    };
  }

  const loadMfaStatus = useCallback(async () => {
    setMfaLoading(true);
    setMfaError("");

    try {
      const payload = await getMFAStatus();
      setMfaStatus(payload);
    } catch (err) {
      setMfaStatus(null);
      setMfaError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load MFA security settings.",
      );
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMfaStatus();
  }, [loadMfaStatus]);

  const mfaEnabled = getMfaEnabled(mfaStatus);

  async function startMfaSetup() {
    setMfaWorking(true);
    setMfaError("");
    setMfaSuccess("");
    setRecoveryCodes([]);
    setShowRecoveryCodes(false);

    try {
      const payload = await setupMFA();
      setMfaSetup(extractMfaSetup(payload));
      setShowMfaSetup(true);
      setMfaOtp("");
      setMfaSuccess(
        "Authenticator setup started. Scan the QR code or enter the secret in your authenticator app.",
      );
    } catch (err) {
      setMfaError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to start MFA setup.",
      );
    } finally {
      setMfaWorking(false);
    }
  }

  async function confirmMfaEnable(event) {
    event?.preventDefault();

    if (!/^\d{6}$/.test(mfaOtp.trim())) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setMfaWorking(true);
    setMfaError("");
    setMfaSuccess("");

    try {
      const payload = await enableMFA(mfaOtp.trim());
      const codes = extractRecoveryCodes(payload);

      setRecoveryCodes(codes);
      setShowRecoveryCodes(codes.length > 0);
      setShowMfaSetup(false);
      setMfaSetup(null);
      setMfaOtp("");
      setMfaSuccess(
        codes.length > 0
          ? "MFA is enabled. Save your recovery codes somewhere secure."
          : "MFA is enabled successfully.",
      );

      await loadMfaStatus();
    } catch (err) {
      setMfaError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to enable MFA.",
      );
    } finally {
      setMfaWorking(false);
    }
  }

  async function confirmMfaDisable(event) {
    event?.preventDefault();

    if (!disablePassword.trim()) {
      setMfaError("Enter your account password to disable MFA.");
      return;
    }

    if (
      disableMethod === "otp" &&
      !/^\d{6}$/.test(disableOtp.trim())
    ) {
      setMfaError("Enter the 6-digit authenticator code.");
      return;
    }

    if (
      disableMethod === "recovery" &&
      !disableRecoveryCode.trim()
    ) {
      setMfaError("Enter a recovery code.");
      return;
    }

    setMfaWorking(true);
    setMfaError("");
    setMfaSuccess("");

    try {
      await disableMFA({
        password: disablePassword,
        otpCode:
          disableMethod === "otp"
            ? disableOtp.trim()
            : null,
        recoveryCode:
          disableMethod === "recovery"
            ? disableRecoveryCode.trim()
            : null,
      });

      setDisablePassword("");
      setDisableOtp("");
      setDisableRecoveryCode("");
      setShowMfaDisable(false);
      setMfaSuccess("MFA has been disabled for this account.");

      await loadMfaStatus();
    } catch (err) {
      setMfaError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to disable MFA.",
      );
    } finally {
      setMfaWorking(false);
    }
  }

  async function confirmRegenerateRecoveryCodes(event) {
    event?.preventDefault();

    if (!/^\d{6}$/.test(regenerateOtp.trim())) {
      setMfaError(
        "Enter the 6-digit authenticator code to regenerate recovery codes.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Regenerate recovery codes? Your existing recovery codes will no longer be usable.",
    );

    if (!confirmed) {
      return;
    }

    setMfaWorking(true);
    setMfaError("");
    setMfaSuccess("");

    try {
      const payload =
        await regenerateMFARecoveryCodes(
          regenerateOtp.trim(),
        );

      const codes = extractRecoveryCodes(payload);

      setRegenerateOtp("");
      setRecoveryCodes(codes);
      setShowRecoveryCodes(true);
      setMfaSuccess(
        "New recovery codes generated. Save them somewhere secure.",
      );
    } catch (err) {
      setMfaError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to regenerate recovery codes.",
      );
    } finally {
      setMfaWorking(false);
    }
  }

  function copyRecoveryCodes() {
    if (!recoveryCodes.length) {
      return;
    }

    const text = recoveryCodes.join("\n");

    if (
      navigator?.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setMfaSuccess(
            "Recovery codes copied to your clipboard.",
          );
        })
        .catch(() => {
          setMfaError(
            "Unable to copy automatically. Please copy the codes manually.",
          );
        });
    }
  }

  const mfaSetupData = mfaSetup || {};
  const setupQrCode = mfaSetupData.qrCode;
  const setupSecret = mfaSetupData.secret;
  const setupProvisioningUri =
    mfaSetupData.provisioningUri;

  // ==========================================================
  // ACTIVE SESSIONS
  // ==========================================================

  const activeSessions = useMemo(
    () =>
      sessions.filter(
        (session) => {
          const revoked =
            session?.revoked_at ||
            session?.revokedAt;

          if (revoked) {
            return false;
          }

          if (session?.expires_at) {
            const expiresAt =
              new Date(
                session.expires_at,
              ).getTime();

            if (
              !Number.isNaN(expiresAt) &&
              expiresAt <= Date.now()
            ) {
              return false;
            }
          }

          return true;
        },
      ),
    [sessions],
  );


  // ==========================================================
  // CURRENT SESSION
  // ==========================================================

  const currentSession = useMemo(
    () =>
      activeSessions.find(
        (session) =>
          session?.is_current === true,
      ),
    [activeSessions],
  );


  const currentSessionText = useMemo(
    () => {
      if (
        sessionRemainingSeconds === null ||
        sessionRemainingSeconds === undefined
      ) {
        return "--:--";
      }

      const safeSeconds = Math.max(
        0,
        Number(sessionRemainingSeconds),
      );

      const minutes = Math.floor(
        safeSeconds / 60,
      );

      const seconds =
        safeSeconds % 60;

      return `${String(minutes).padStart(
        2,
        "0",
      )}:${String(seconds).padStart(
        2,
        "0",
      )}`;
    },
    [sessionRemainingSeconds],
  );


  const roles = Array.isArray(user?.roles)
    ? user.roles
    : [];


  // ==========================================================
  // SIGN OUT OTHER SESSIONS
  // ==========================================================

  async function signOutOtherSessions() {
    const otherSessions =
      activeSessions.filter(
        (session) =>
          session?.is_current !== true,
      );

    if (otherSessions.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Sign out ${otherSessions.length} other active session${
        otherSessions.length === 1
          ? ""
          : "s"
      }?`,
    );

    if (!confirmed) {
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      await logoutAllOtherSessions();

      setSuccess(
        "All other active sessions have been signed out.",
      );

      await loadSessions();
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Unable to sign out other sessions.",
      );
    } finally {
      setWorking(false);
    }
  }


  const otherSessionCount =
    activeSessions.filter(
      (session) =>
        session?.is_current !== true,
    ).length;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="security-page">

      <div className="security-eyebrow">
        Identity / Security
      </div>


      <div className="security-header">

        <div>
          <h1>
            Security &amp; Sessions
          </h1>

          <p>
            Review active EduSphere sessions
            and secure your administrator
            account.
          </p>
        </div>


        <button
          type="button"
          className="security-refresh"
          onClick={loadSessions}
          disabled={loading || working}
        >
          <Icon
            name="refresh"
            size={15}
          />

          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>


      {error && (
        <div
          className="security-alert"
          role="alert"
        >
          {error}
        </div>
      )}


      {success && (
        <div
          className="security-success"
          role="status"
        >
          {success}
        </div>
      )}


      <section className="security-overview">

        <article className="security-stat">

          <span className="security-stat-label">
            Active Sessions
          </span>

          <strong className="security-stat-value">
            {activeSessions.length}
          </strong>

          <span className="security-stat-note">
            Currently authenticated devices
          </span>

        </article>


        <article className="security-stat">

          <span className="security-stat-label">
            Account
          </span>

          <strong
            className="security-stat-value"
            style={{ fontSize: "18px" }}
          >
            {user?.email || "Unknown"}
          </strong>

          <span className="security-stat-note">
            {user?.full_name ||
              "EduSphere user"}
          </span>

        </article>


        <article className="security-stat">

          <span className="security-stat-label">
            Current Session
          </span>

          <strong className="security-stat-value">
            {currentSessionText}
          </strong>

          <span className="security-stat-note">
            Time remaining
          </span>

        </article>

      </section>


      <section className="security-panel">

        <div className="security-panel-header">

          <div className="security-panel-title">

            <span className="security-panel-icon">
              <Icon
                name="shield"
                size={19}
              />
            </span>

            <div>
              <h2>
                Active Sessions
              </h2>

              <p>
                Devices currently signed in
                to this account.
              </p>
            </div>

          </div>


          <span className="security-count">
            {activeSessions.length} Active
          </span>

        </div>


        {loading ? (

          <div className="security-empty">

            <strong>
              Loading sessions...
            </strong>

            <p>
              Checking your active security
              sessions.
            </p>

          </div>

        ) : activeSessions.length === 0 ? (

          <div className="security-empty">

            <strong>
              No active sessions found
            </strong>

            <p>
              The current authenticated
              session will appear here when
              available.
            </p>

          </div>

        ) : (

          <div className="security-session-list">

            {activeSessions.map(
              (session) => {

                const id =
                  session?.id ||
                  session?.jti;

                const device =
                  getDeviceLabel(
                    session,
                  );

                const browser =
                  getBrowserLabel(
                    session,
                  );

                const ip =
                  session?.ip_address ||
                  session?.ipAddress ||
                  "IP unavailable";

                const created =
                  session?.created_at ||
                  session?.createdAt;

                const lastSeen =
                  session?.last_seen_at ||
                  session?.lastSeenAt;

                const expires =
                  session?.expires_at ||
                  session?.expiresAt;

                const isCurrent =
                  session?.is_current === true;


                return (
                  <article
                    className="security-session"
                    key={id}
                  >

                    <div className="security-device">
                      <Icon
                        name="monitor"
                        size={19}
                      />
                    </div>


                    <div className="security-session-main">

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >

                        <strong>
                          {device}
                        </strong>

                        {isCurrent && (
                          <span className="security-current">
                            CURRENT
                          </span>
                        )}

                      </div>


                      <span>
                        {browser}
                      </span>


                      <div className="security-session-meta">

                        <span>
                          IP: {ip}
                        </span>

                        <span>
                          Created:{" "}
                          {formatDate(
                            created,
                          )}
                        </span>

                        <span>
                          Last active:{" "}
                          {formatDate(
                            lastSeen,
                          )}
                        </span>

                        <span>
                          Expires:{" "}
                          {formatDate(
                            expires,
                          )}
                        </span>

                      </div>


                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          marginTop: "7px",
                          fontSize: "11px",
                          fontWeight: 700,
                          opacity: 0.72,
                        }}
                      >
                        <Icon
                          name="clock"
                          size={12}
                        />

                        {formatRemaining(
                          expires,
                        )}
                      </span>

                    </div>

                  </article>
                );
              },
            )}

          </div>

        )}


        <div className="security-actions">

          <button
            type="button"
            className="security-danger-button"
            onClick={
              signOutOtherSessions
            }
            disabled={
              working ||
              loading ||
              otherSessionCount === 0
            }
          >

            <Icon
              name="logout"
              size={14}
            />

            {working
              ? "Signing out..."
              : otherSessionCount > 0
                ? `Sign Out Other Sessions (${otherSessionCount})`
                : "No Other Sessions"}

          </button>

        </div>

      </section>



      {/* ==========================================================
          MULTI-FACTOR AUTHENTICATION
      ========================================================== */}

      <section className="security-panel" style={{ marginTop: "18px" }}>
        <div className="security-panel-header">
          <div className="security-panel-title">
            <span className="security-panel-icon"><Icon name="shield" size={19} /></span>
            <div>
              <h2>Extra Sign-in Security</h2>
              <p>Set up an authenticator once. If you cannot use it, use a one-time code sent to your registered email.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="security-count" style={{ background: mfaEnabled ? "#e9f8ef" : "#f4f4f5", color: mfaEnabled ? "#147a43" : "#666" }}>
              {mfaLoading ? "Checking..." : mfaEnabled ? "Protected" : "Not Set Up"}
            </span>

            {!mfaLoading && !mfaEnabled && !showMfaSetup && (
              <button
                type="button"
                className="security-refresh"
                onClick={startMfaSetup}
                disabled={mfaWorking}
              >
                {mfaWorking ? "Preparing..." : "Set Up MFA"}
              </button>
            )}

            {!mfaLoading && mfaEnabled && (
              <button
                type="button"
                className="security-danger-button"
                onClick={() => setShowMfaDisable((value) => !value)}
                disabled={mfaWorking}
              >
                {showMfaDisable ? "Close Disable" : "Disable MFA"}
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {mfaError && <div className="security-alert" role="alert" style={{ marginBottom: "14px" }}>{mfaError}</div>}
          {mfaSuccess && <div className="security-success" role="status" style={{ marginBottom: "14px" }}>{mfaSuccess}</div>}

          {mfaLoading ? (
            <div className="security-empty">
              <strong>Checking your security setup...</strong>
              <p>Please wait while we load your MFA settings.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px", marginBottom: "18px" }}>
                <div style={{ border: "1px solid #e8e8ec", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.58, marginBottom: "7px" }}>1 · Authenticator</div>
                  <strong style={{ display: "block", fontSize: "15px" }}>{mfaEnabled ? "Connected" : "Recommended"}</strong>
                  <span style={{ display: "block", marginTop: "6px", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>Google Authenticator, Microsoft Authenticator, Authy or another TOTP app.</span>
                </div>
                <div style={{ border: "1px solid #e8e8ec", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.58, marginBottom: "7px" }}>2 · Email Backup</div>
                  <strong style={{ display: "block", fontSize: "15px" }}>{mfaEnabled ? "Ready automatically" : "Available after MFA setup"}</strong>
                  <span style={{ display: "block", marginTop: "6px", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>
                    No separate setup is needed. After MFA is enabled, choose <strong>Email OTP</strong> on the sign-in screen and the one-time code will be sent to {user?.email || "your registered email"}.
                  </span>
                </div>
                {mfaEnabled && (
                  <div style={{ border: "1px solid #e8e8ec", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.58, marginBottom: "7px" }}>3 · Recovery</div>
                    <strong style={{ display: "block", fontSize: "15px" }}>{mfaStatus?.remaining_recovery_codes ?? mfaStatus?.data?.remaining_recovery_codes ?? 0} codes available</strong>
                    <span style={{ display: "block", marginTop: "6px", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>Emergency codes work once each. Store them somewhere safe.</span>
                  </div>
                )}
              </div>

              {!mfaEnabled ? (
                !showMfaSetup ? (
                  <div style={{ borderRadius: "16px", padding: "18px", background: "#f7f9fc", border: "1px solid #e4e9f0" }}>
                    <strong style={{ display: "block", fontSize: "16px", marginBottom: "7px" }}>Set up MFA in about 1 minute</strong>
                    <p style={{ margin: "0 0 14px", fontSize: "13px", lineHeight: 1.6, opacity: 0.75 }}>Scan a QR code with your authenticator app, enter the 6-digit code it gives you, and MFA is ready. Email backup needs no extra setup.</p>
                    <button type="button" className="security-refresh" onClick={startMfaSetup} disabled={mfaWorking}>{mfaWorking ? "Preparing secure setup..." : "Set Up MFA"}</button>
                  </div>
                ) : (
                  <div style={{ border: "1px solid #e0e5eb", borderRadius: "16px", overflow: "hidden", background: "#fff" }}>
                    <div style={{ padding: "18px", background: "#f7f9fc", borderBottom: "1px solid #e8ebef" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.58, marginBottom: "5px" }}>Step 1 of 2</div>
                      <strong style={{ fontSize: "17px" }}>Connect your authenticator app</strong>
                      <p style={{ margin: "6px 0 0", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>Open your authenticator app and scan the QR code below.</p>
                    </div>

                    <div style={{ padding: "20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(220px, 1fr)", gap: "22px", alignItems: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "230px" }}>
                          {setupQrCode ? (
                            <div style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", padding: "12px", background: "#fff", border: "1px solid #dfe3e8", borderRadius: "14px" }}>
                                <img src={setupQrCode} alt="EduSphere MFA setup QR code" style={{ width: "210px", height: "210px", display: "block", objectFit: "contain" }} />
                              </div>
                              <div style={{ marginTop: "9px", fontSize: "11px", opacity: 0.62 }}>Scan with your phone</div>
                            </div>
                          ) : (
                            <div style={{ padding: "16px", borderRadius: "12px", background: "#fff8e8", border: "1px solid #f0dfb2", fontSize: "12px", lineHeight: 1.55 }}>QR code is unavailable. Use the manual setup key instead.</div>
                          )}
                        </div>

                        <div>
                          <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}><b>1.</b><span style={{ fontSize: "12px", lineHeight: 1.55 }}>Install or open an authenticator app on your phone.</span></div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}><b>2.</b><span style={{ fontSize: "12px", lineHeight: 1.55 }}>Choose <strong>Scan a QR code</strong> and scan this code.</span></div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}><b>3.</b><span style={{ fontSize: "12px", lineHeight: 1.55 }}>If scanning fails, use the manual setup key below.</span></div>
                          </div>

                          {setupSecret && (
                            <details style={{ marginBottom: "15px", border: "1px solid #e7e9ed", borderRadius: "10px", padding: "10px 12px" }}>
                              <summary style={{ cursor: "pointer", fontSize: "12px", fontWeight: 800 }}>Can't scan? Show manual setup key</summary>
                              <code style={{ display: "block", marginTop: "10px", padding: "10px", borderRadius: "8px", background: "#f7f7f9", wordBreak: "break-all", fontSize: "12px" }}>{setupSecret}</code>
                            </details>
                          )}

                          {setupProvisioningUri && (
                            <details>
                              <summary style={{ cursor: "pointer", fontSize: "11px", fontWeight: 700, opacity: 0.65 }}>Advanced: show setup URI</summary>
                              <code style={{ display: "block", marginTop: "8px", padding: "9px", borderRadius: "8px", background: "#f7f7f9", fontSize: "10px", wordBreak: "break-all" }}>{setupProvisioningUri}</code>
                            </details>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eceef1" }}>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.58, marginBottom: "6px" }}>Step 2 of 2</div>
                        <strong style={{ fontSize: "16px" }}>Confirm it works</strong>
                        <p style={{ margin: "5px 0 12px", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>Enter the current 6-digit code from your authenticator app.</p>
                        <form onSubmit={confirmMfaEnable}>
                          <input value={mfaOtp} onChange={(event) => setMfaOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter 6-digit code" aria-label="Authenticator verification code" style={{ width: "100%", maxWidth: "300px", boxSizing: "border-box", padding: "13px 14px", border: "1px solid #d7dbe1", borderRadius: "10px", fontSize: "18px", letterSpacing: "0.18em", textAlign: "center" }} />
                          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginTop: "12px" }}>
                            <button type="submit" className="security-refresh" disabled={mfaWorking || mfaOtp.length !== 6}>{mfaWorking ? "Verifying..." : "Verify & Enable MFA"}</button>
                            <button type="button" className="security-refresh" onClick={() => { setShowMfaSetup(false); setMfaSetup(null); setMfaOtp(""); setMfaError(""); setMfaSuccess(""); }} disabled={mfaWorking}>Cancel</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div style={{ border: "1px solid #d8eadf", background: "#f5fbf7", borderRadius: "16px", padding: "17px", marginBottom: "16px" }}>
                    <strong style={{ display: "block", fontSize: "15px" }}>✓ Your account is protected with MFA</strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", lineHeight: 1.55, opacity: 0.72 }}>Use your authenticator code normally. If you cannot access it, choose <strong>Email OTP</strong> on the MFA login screen.</p>
                  </div>

                  <div style={{ border: "1px solid #e8e8ec", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                    <strong style={{ display: "block", fontSize: "14px" }}>Emergency recovery codes</strong>
                    <p style={{ margin: "5px 0 12px", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>Save these somewhere safe. Each recovery code works only once.</p>
                    {recoveryCodes.length > 0 ? (
                      showRecoveryCodes ? (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "7px", marginBottom: "12px" }}>
                            {recoveryCodes.map((code, index) => (
                              <code
                                key={`${code}-${index}`}
                                style={{
                                  padding: "10px",
                                  borderRadius: "8px",
                                  background: "#f7f7f9",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textAlign: "center",
                                }}
                              >
                                {code}
                              </code>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="security-refresh"
                              onClick={copyRecoveryCodes}
                            >
                              Copy Codes
                            </button>

                            <button
                              type="button"
                              className="security-refresh"
                              onClick={() => setShowRecoveryCodes(false)}
                            >
                              Hide Codes
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", opacity: 0.65 }}>
                            Recovery codes are hidden on this screen.
                          </span>

                          <button
                            type="button"
                            className="security-refresh"
                            onClick={() => setShowRecoveryCodes(true)}
                          >
                            Show Codes
                          </button>
                        </div>
                      )
                    ) : (
                      <p style={{ margin: 0, fontSize: "12px", opacity: 0.62 }}>
                        No recovery codes are currently available on this screen.
                        Generate a new set below using your authenticator code.
                      </p>
                    )}

                    <form onSubmit={confirmRegenerateRecoveryCodes} style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eeeeef" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "6px" }}>Generate new codes using your authenticator</label>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <input value={regenerateOtp} onChange={(event) => setRegenerateOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" style={{ width: "170px", boxSizing: "border-box", padding: "10px 11px", border: "1px solid #dcdce2", borderRadius: "9px" }} />
                        <button type="submit" className="security-refresh" disabled={mfaWorking || regenerateOtp.length !== 6}>{mfaWorking ? "Generating..." : "Generate New Codes"}</button>
                      </div>
                    </form>
                  </div>

                  <div style={{ border: "1px solid #e1e7f0", background: "#f7f9fc", borderRadius: "14px", padding: "15px", marginBottom: "16px" }}>
                    <strong style={{ display: "block", fontSize: "13px" }}>Email OTP backup is ready</strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", lineHeight: 1.55, opacity: 0.7 }}>No extra setup is required. During MFA sign-in, choose <strong>Email OTP</strong> and EduSphere will send a one-time code to {user?.email || "your registered email"}.</p>
                  </div>

                  {showMfaDisable && (
                    <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #f0dddd", borderRadius: "14px", background: "#fffafa" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#a12626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Disable MFA</div>
                      <p style={{ margin: "0 0 13px", fontSize: "12px", lineHeight: 1.55, opacity: 0.75 }}>Disabling MFA reduces account protection. Your account password and one valid MFA factor are required.</p>

                      <form onSubmit={confirmMfaDisable}>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "6px" }}>Account password</label>
                        <input type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} autoComplete="current-password" placeholder="Enter account password" style={{ width: "100%", maxWidth: "340px", boxSizing: "border-box", padding: "10px 11px", border: "1px solid #dcdce2", borderRadius: "9px", marginBottom: "12px" }} />

                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                          <button type="button" className="security-refresh" onClick={() => setDisableMethod("otp")} style={{ opacity: disableMethod === "otp" ? 1 : 0.65 }}>Authenticator Code</button>
                          <button type="button" className="security-refresh" onClick={() => setDisableMethod("recovery")} style={{ opacity: disableMethod === "recovery" ? 1 : 0.65 }}>Recovery Code</button>
                        </div>

                        {disableMethod === "otp" ? (
                          <input value={disableOtp} onChange={(event) => setDisableOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit authenticator code" style={{ width: "100%", maxWidth: "340px", boxSizing: "border-box", padding: "10px 11px", border: "1px solid #dcdce2", borderRadius: "9px" }} />
                        ) : (
                          <input value={disableRecoveryCode} onChange={(event) => setDisableRecoveryCode(event.target.value)} autoComplete="off" placeholder="Enter recovery code" style={{ width: "100%", maxWidth: "340px", boxSizing: "border-box", padding: "10px 11px", border: "1px solid #dcdce2", borderRadius: "9px" }} />
                        )}

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                          <button type="submit" className="security-danger-button" disabled={mfaWorking}>
                            {mfaWorking ? "Disabling..." : "Confirm Disable MFA"}
                          </button>
                          <button
                            type="button"
                            className="security-refresh"
                            onClick={() => {
                              setShowMfaDisable(false);
                              setDisablePassword("");
                              setDisableOtp("");
                              setDisableRecoveryCode("");
                              setMfaError("");
                            }}
                            disabled={mfaWorking}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {roles.length > 0 && (

        <section
          className="security-panel"
          style={{
            marginTop: "18px",
          }}
        >

          <div className="security-panel-header">

            <div className="security-panel-title">

              <span className="security-panel-icon">
                <Icon
                  name="shield"
                  size={19}
                />
              </span>

              <div>
                <h2>
                  Account Access
                </h2>

                <p>
                  Roles currently assigned
                  to this account.
                </p>
              </div>

            </div>

          </div>


          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >

            {roles.map((role) => (

              <span
                key={
                  typeof role === "string"
                    ? role
                    : role?.id ||
                      role?.name
                }
                style={{
                  padding: "7px 10px",
                  borderRadius: "999px",
                  background: "#f3f1ff",
                  color: "#5d35c4",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {typeof role === "string"
                  ? role
                  : role?.name ||
                    "Role"}
              </span>

            ))}

          </div>

        </section>

      )}

    </div>
  );
}
