import apiClient from "./client";

function unwrap(response) {
  return response?.data?.data ?? response?.data;
}

export async function getUsers(params = {}) {
  const response = await apiClient.get("/users", {
    params,
  });

  return response.data;
}

export async function getUserRoles() {
  const response = await apiClient.get("/users/roles");

  return unwrap(response);
}

export async function getUser(userId) {
  const response = await apiClient.get(
    `/users/${userId}`,
  );

  return unwrap(response);
}

export async function createUser(data) {
  const response = await apiClient.post(
    "/users",
    data,
  );

  return unwrap(response);
}

export async function updateUser(userId, data) {
  const response = await apiClient.patch(
    `/users/${userId}`,
    data,
  );

  return unwrap(response);
}

export async function updateUserStatus(
  userId,
  isActive,
) {
  const response = await apiClient.patch(
    `/users/${userId}/status`,
    null,
    {
      params: {
        is_active: isActive,
      },
    },
  );

  return unwrap(response);
}

export async function resetUserPassword(
  userId,
  password,
) {
  const response = await apiClient.post(
    `/users/${userId}/password`,
    {
      password,
    },
  );

  return unwrap(response);
}

export async function deleteUser(userId) {
  const response = await apiClient.delete(
    `/users/${userId}`,
  );

  return response.data;
}