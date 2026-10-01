import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { sendEmailOTP } from "../api/auth";

function maskEmail(value) {
  const email = String(value || "").trim();

  if (!email || !email.includes("@")) {
    return "your registered email";
  }

  const [name, domain] = email.split("@");

  if (!name) {
    return `•••@${domain}`;
  }

  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, Math.min(6, name.length - visible.length)))}@${domain}`;
}

function MethodCard({ active, title, description, icon, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`mfa-method-card${active ? " active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      role="tab"
      aria-selected={active}
    >
      <span className="mfa-method-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="mfa-method-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className="mfa-method-check" aria-hidden="true">
        {active ? "✓" : ""}
      </span>
    </button>
  );
}

export default function Login() {
  const {
    login,
    verifyMFA,
    cancelMFA,
    isAuthenticated,
    mfaRequired,
    mfaChallengeToken,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [mfaMethod, setMfaMethod] = useState("authenticator");

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);

  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  useEffect(() => {
    if (emailOtpCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setEmailOtpCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailOtpCooldown]);

  useEffect(() => {
    if (!mfaRequired) {
      return;
    }

    setOtpCode("");
    setEmailOtpCode("");
    setRecoveryCode("");
    setMfaMethod("authenticator");
    setEmailOtpSent(false);
    setEmailOtpCooldown(0);
    setError("");
  }, [mfaRequired]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handlePasswordLogin(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const result = await login(email.trim(), password);

      if (result?.mfaRequired) {
        return;
      }

      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "Unable to sign in. Please check your email and password.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendEmailOTP() {
    setError("");

    if (!mfaChallengeToken) {
      setError("Your security check has expired. Please sign in again.");
      return;
    }

    if (emailOtpCooldown > 0) {
      return;
    }

    setSendingEmailOtp(true);

    try {
      const result = await sendEmailOTP(mfaChallengeToken);

      setEmailOtpSent(true);
      setEmailOtpCode("");

      const cooldown = Number(result?.cooldown_seconds) || 60;
      setEmailOtpCooldown(cooldown);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "We could not send the verification code. Please try again.";

      setError(message);
    } finally {
      setSendingEmailOtp(false);
    }
  }

  async function handleMFAVerification(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      if (!mfaChallengeToken) {
        throw new Error("Your security check has expired. Please sign in again.");
      }

      if (mfaMethod === "recovery") {
        const normalizedRecoveryCode = recoveryCode
          .trim()
          .toUpperCase()
          .replace(/\s/g, "");

        if (!normalizedRecoveryCode) {
          throw new Error("Please enter your recovery code.");
        }

        await verifyMFA({
          challengeToken: mfaChallengeToken,
          otpCode: null,
          emailOtpCode: null,
          recoveryCode: normalizedRecoveryCode,
        });
      } else if (mfaMethod === "email") {
        const normalizedEmailOtp = emailOtpCode
          .replace(/\D/g, "")
          .slice(0, 6);

        if (normalizedEmailOtp.length !== 6) {
          throw new Error("Please enter the 6-digit email code.");
        }

        await verifyMFA({
          challengeToken: mfaChallengeToken,
          otpCode: null,
          emailOtpCode: normalizedEmailOtp,
          recoveryCode: null,
        });
      } else {
        const normalizedOtp = otpCode
          .replace(/\D/g, "")
          .slice(0, 6);

        if (normalizedOtp.length !== 6) {
          throw new Error("Please enter the 6-digit authenticator code.");
        }

        await verifyMFA({
          challengeToken: mfaChallengeToken,
          otpCode: normalizedOtp,
          emailOtpCode: null,
          recoveryCode: null,
        });
      }

      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "We could not verify your code. Please try again.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToLogin() {
    setError("");
    setOtpCode("");
    setEmailOtpCode("");
    setRecoveryCode("");
    setMfaMethod("authenticator");
    setEmailOtpSent(false);
    setEmailOtpCooldown(0);
    cancelMFA();
  }

  function switchMFA(method) {
    setError("");
    setOtpCode("");
    setEmailOtpCode("");
    setRecoveryCode("");
    setEmailOtpSent(false);
    setEmailOtpCooldown(0);
    setMfaMethod(method);
  }

  const mfaBusy = submitting || sendingEmailOtp;

  return (
    <main className="auth-page">
      <section className={`login-card${mfaRequired ? " mfa-login-card" : ""}`}>
        <div className="brand">
          <div className="brand-mark">E</div>

          <div>
            <h1>EduSphere</h1>
            <p>School Operating System</p>
          </div>
        </div>

        {!mfaRequired ? (
          <>
            <div className="login-heading">
              <h2>Welcome back</h2>
              <p>Sign in to continue to EduSphere.</p>
            </div>

            <form onSubmit={handlePasswordLogin}>
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
                disabled={submitting}
              />

              <label htmlFor="password">Password</label>

              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={submitting}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mfa-progress">
              <span className="mfa-progress-step done">1</span>
              <span className="mfa-progress-line" />
              <span className="mfa-progress-step active">2</span>
            </div>

            <div className="login-heading">
              <h2>One more security check</h2>
              <p>Verify your identity to finish signing in.</p>
            </div>

            <div className="mfa-email-hint">
              <span aria-hidden="true">🔐</span>
              <span>
                <strong>You're almost in.</strong>
                <small>Your account has an extra security step.</small>
              </span>
            </div>

            <div
              className="mfa-methods"
              role="tablist"
              aria-label="Choose verification method"
            >
              <MethodCard
                active={mfaMethod === "authenticator"}
                title="Authenticator app"
                description="Use the 6-digit code from your app"
                icon="⌁"
                onClick={() => switchMFA("authenticator")}
                disabled={mfaBusy}
              />

              <MethodCard
                active={mfaMethod === "email"}
                title="Email code"
                description="Get a one-time code by email"
                icon="✉"
                onClick={() => switchMFA("email")}
                disabled={mfaBusy}
              />

              <MethodCard
                active={mfaMethod === "recovery"}
                title="Recovery code"
                description="Use a saved backup code"
                icon="↗"
                onClick={() => switchMFA("recovery")}
                disabled={mfaBusy}
              />
            </div>

            <form onSubmit={handleMFAVerification}>
              {mfaMethod === "authenticator" && (
                <div className="mfa-panel">
                  <div className="mfa-panel-title">
                    <span>Authenticator app</span>
                    <small>Recommended</small>
                  </div>

                  <p className="mfa-help">
                    Open your authenticator app and enter the current 6-digit code.
                  </p>

                  <label htmlFor="otpCode">6-digit code</label>

                  <input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(event) =>
                      setOtpCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={submitting}
                    autoFocus
                    aria-describedby="otp-help"
                  />

                  <small id="otp-help" className="mfa-field-hint">
                    The code changes every few seconds.
                  </small>
                </div>
              )}

              {mfaMethod === "email" && (
                <div className="mfa-panel">
                  <div className="mfa-panel-title">
                    <span>Email verification</span>
                    <small>Easy backup</small>
                  </div>

                  {!emailOtpSent ? (
                    <>
                      <p className="mfa-help">
                        We'll send a one-time 6-digit code to{" "}
                        <strong>{maskedEmail}</strong>.
                      </p>

                      <button
                        type="button"
                        className="login-button"
                        onClick={handleSendEmailOTP}
                        disabled={mfaBusy || emailOtpCooldown > 0}
                      >
                        {sendingEmailOtp ? "Sending code..." : "Send code to email"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mfa-sent-banner" role="status">
                        <span aria-hidden="true">✓</span>
                        <span>
                          <strong>Code sent</strong>
                          <small>
                            Check {maskedEmail} for your 6-digit verification code.
                          </small>
                        </span>
                      </div>

                      <label htmlFor="emailOtpCode">Email code</label>

                      <input
                        id="emailOtpCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={emailOtpCode}
                        onChange={(event) =>
                          setEmailOtpCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={submitting}
                        autoFocus
                      />

                      <button
                        type="button"
                        className="password-toggle mfa-resend-button"
                        onClick={handleSendEmailOTP}
                        disabled={mfaBusy || emailOtpCooldown > 0}
                      >
                        {sendingEmailOtp
                          ? "Sending..."
                          : emailOtpCooldown > 0
                            ? `Resend code in ${emailOtpCooldown}s`
                            : "Resend code"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {mfaMethod === "recovery" && (
                <div className="mfa-panel">
                  <div className="mfa-panel-title">
                    <span>Recovery code</span>
                    <small>Backup access</small>
                  </div>

                  <p className="mfa-help">
                    Enter one of the recovery codes you saved when MFA was enabled.
                  </p>

                  <label htmlFor="recoveryCode">Recovery code</label>

                  <input
                    id="recoveryCode"
                    type="text"
                    autoComplete="off"
                    value={recoveryCode}
                    onChange={(event) =>
                      setRecoveryCode(
                        event.target.value.toUpperCase().replace(/\s/g, ""),
                      )
                    }
                    placeholder="Enter recovery code"
                    required
                    disabled={submitting}
                    autoFocus
                  />

                  <small className="mfa-field-hint">
                    Each recovery code can be used only once.
                  </small>
                </div>
              )}

              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}

              {(mfaMethod !== "email" || emailOtpSent) && (
                <button
                  type="submit"
                  className="login-button"
                  disabled={submitting}
                >
                  {submitting ? "Verifying..." : "Verify and continue"}
                </button>
              )}

              <button
                type="button"
                className="password-toggle"
                onClick={handleBackToLogin}
                disabled={mfaBusy}
              >
                ← Back to sign in
              </button>
            </form>

            <p className="mfa-security-note">
              Your verification is encrypted and used only to complete this sign-in.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
