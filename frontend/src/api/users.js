import apiClient from "./client";


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrap(response) {
  return response?.data?.data ?? response?.data;
}


function normalizeUserId(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user ID.");
  }

  return id;
}


function normalizeUserIds(userIds) {
  if (!Array.isArray(userIds)) {
    throw new Error("User IDs must be an array.");
  }

  const normalized = [
    ...new Set(
      userIds
        .map((userId) => Number(userId))
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  ];

  if (!normalized.length) {
    throw new Error("At least one valid user ID is required.");
  }

  if (normalized.length > 500) {
    throw new Error("You can select up to 500 users at once.");
  }

  return normalized;
}


function normalizeRoleId(roleId) {
  const id = Number(roleId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid role ID.");
  }

  return id;
}


// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(params = {}) {
  const response = await apiClient.get(
    "/users",
    {
      params,
    },
  );

  // List endpoint returns:
  // {
  //   success: true,
  //   data: [...],
  //   meta: {...}
  // }
  //
  // Keep the complete response here because callers need pagination meta.
  return response?.data ?? response;
}


export async function getUser(userId) {
  const id = normalizeUserId(userId);

  const response = await apiClient.get(
    `/users/${id}`,
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Roles available for User Management
// ---------------------------------------------------------------------------

export async function getUserRoles() {
  const response = await apiClient.get(
    "/users/roles",
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export async function createUser(data) {
  if (!data || typeof data !== "object") {
    throw new Error("User data is required.");
  }

  const response = await apiClient.post(
    "/users",
    data,
  );

  return unwrap(response);
}


export async function updateUser(
  userId,
  data,
) {
  const id = normalizeUserId(userId);

  if (!data || typeof data !== "object") {
    throw new Error("User update data is required.");
  }

  const response = await apiClient.patch(
    `/users/${id}`,
    data,
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function updateUserStatus(
  userId,
  isActive,
) {
  const id = normalizeUserId(userId);

  if (typeof isActive !== "boolean") {
    throw new Error("User status must be a boolean.");
  }

  const response = await apiClient.patch(
    `/users/${id}/status`,
    {
      is_active: isActive,
    },
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Bulk Status
// ---------------------------------------------------------------------------

export async function bulkUpdateUserStatus(
  userIds,
  isActive,
) {
  const ids = normalizeUserIds(userIds);

  if (typeof isActive !== "boolean") {
    throw new Error("User status must be a boolean.");
  }

  const response = await apiClient.patch(
    "/users/bulk/status",
    {
      user_ids: ids,
      is_active: isActive,
    },
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Bulk Role Assignment
// ---------------------------------------------------------------------------

export async function bulkAssignUserRole(
  userIds,
  roleId,
) {
  const ids = normalizeUserIds(userIds);
  const role = normalizeRoleId(roleId);

  const response = await apiClient.patch(
    "/users/bulk/role",
    {
      user_ids: ids,
      role_id: role,
    },
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export async function resetUserPassword(
  userId,
  password,
) {
  const id = normalizeUserId(userId);

  if (
    typeof password !== "string" ||
    password.length < 8
  ) {
    throw new Error(
      "Password must contain at least 8 characters.",
    );
  }

  const response = await apiClient.post(
    `/users/${id}/password`,
    {
      password,
    },
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteUser(userId) {
  const id = normalizeUserId(userId);

  const response = await apiClient.delete(
    `/users/${id}`,
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// Bulk Delete
// ---------------------------------------------------------------------------

export async function bulkDeleteUsers(userIds) {
  const ids = normalizeUserIds(userIds);

  const response = await apiClient.delete(
    "/users/bulk",
    {
      data: {
        user_ids: ids,
      },
    },
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// User ↔ Role
// ---------------------------------------------------------------------------

export async function assignUserRole(
  userId,
  roleId,
) {
  const id = normalizeUserId(userId);
  const role = normalizeRoleId(roleId);

  const response = await apiClient.post(
    `/rbac/users/${id}/roles`,
    {
      id: role,
    },
  );

  return unwrap(response);
}


export async function removeUserRole(
  userId,
  roleId,
) {
  const id = normalizeUserId(userId);
  const role = normalizeRoleId(roleId);

  const response = await apiClient.delete(
    `/rbac/users/${id}/roles/${role}`,
  );

  return unwrap(response);
}


// ---------------------------------------------------------------------------
// User effective permissions
// ---------------------------------------------------------------------------

export async function getUserPermissions(
  userId,
) {
  const id = normalizeUserId(userId);

  const response = await apiClient.get(
    `/rbac/users/${id}/permissions`,
  );

  return unwrap(response);
}