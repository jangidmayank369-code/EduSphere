const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "edusphere_access_token";

async function parseResponse(response) {
  const contentType =
    response.headers.get("content-type") || "";

  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { detail: text } : null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);

    error.status = response.status;
    error.code =
      data?.error?.code ||
      data?.code;

    error.details =
      data?.error?.details ||
      data?.details;

    error.response = {
      status: response.status,
      data,
    };

    throw error;
  }

  return data;
}

async function request(
  path,
  options = {},
) {
  const token =
    localStorage.getItem(TOKEN_KEY);

  const headers = new Headers(
    options.headers || {},
  );

  if (!headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  );

  return parseResponse(response);
}


/* =========================
   Authentication
========================= */

export async function login(
  email,
  password,
) {
  return request(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );
}


/* =========================
   MFA Login
========================= */

export async function verifyMFALogin(
  challengeToken,
  {
    otpCode = null,
    recoveryCode = null,
    emailOtpCode = null,
  } = {},
) {
  return request(
    "/auth/mfa/verify-login",
    {
      method: "POST",
      body: JSON.stringify({
        challenge_token:
          challengeToken,

        otp_code:
          otpCode || null,

        recovery_code:
          recoveryCode || null,

        email_otp_code:
          emailOtpCode || null,
      }),
    },
  );
}


export async function sendEmailOTP(
  challengeToken,
) {
  if (!challengeToken) {
    const error = new Error(
      "Your MFA challenge has expired. Please sign in again.",
    );

    error.code =
      "INVALID_MFA_CHALLENGE";

    throw error;
  }

  return request(
    `/auth/mfa/send-email-otp?challenge_token=${encodeURIComponent(
      challengeToken,
    )}`,
    {
      method: "POST",
    },
  );
}


export async function getCurrentUser() {
  return request(
    "/auth/me",
  );
}


export async function logout() {
  try {
    return await request(
      "/auth/logout",
      {
        method: "POST",
      },
    );
  } finally {
    localStorage.removeItem(
      TOKEN_KEY,
    );
  }
}


export async function logoutAllOtherSessions() {
  return request(
    "/auth/logout-all",
    {
      method: "POST",
    },
  );
}


export async function getSessions() {
  return request(
    "/auth/sessions",
  );
}


/* =========================
   MFA Management
========================= */

export async function getMFAStatus() {
  return request(
    "/auth/mfa/status",
  );
}


export async function setupMFA() {
  return request(
    "/auth/mfa/setup",
    {
      method: "POST",
    },
  );
}


export async function enableMFA(
  otpCode,
) {
  return request(
    "/auth/mfa/enable",
    {
      method: "POST",
      body: JSON.stringify({
        otp_code: otpCode,
      }),
    },
  );
}


export async function disableMFA({
  password,
  otpCode = null,
  recoveryCode = null,
}) {
  return request(
    "/auth/mfa/disable",
    {
      method: "POST",
      body: JSON.stringify({
        password,
        otp_code:
          otpCode || null,
        recovery_code:
          recoveryCode || null,
      }),
    },
  );
}


export async function regenerateMFARecoveryCodes(
  otpCode,
) {
  return request(
    "/auth/mfa/recovery-codes/regenerate",
    {
      method: "POST",
      body: JSON.stringify({
        otp_code: otpCode,
      }),
    },
  );
}