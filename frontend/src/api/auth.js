import apiClient from "./client";

function unwrap(response) {
  return response?.data ?? response;
}

export async function login(email, password) {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  const payload = unwrap(response);

  const token =
    payload?.access_token ||
    payload?.data?.access_token;

  if (!token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  return {
    ...payload,
    access_token: token,
  };
}

export async function getCurrentUser() {
  const response = await apiClient.get("/auth/me");

  return unwrap(response);
}