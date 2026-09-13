import apiClient from "./client";

const BASE_URL = "/students";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function unwrapList(response) {
  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

/* =========================================================
   STUDENTS
========================================================= */

export async function getStudents(params = {}) {
  const response = await apiClient.get(BASE_URL, {
    params: {
      ...(params.schoolId !== undefined
        ? { school_id: params.schoolId }
        : {}),
      ...(params.academicSessionId !== undefined
        ? {
            academic_session_id:
              params.academicSessionId,
          }
        : {}),
      ...(params.search
        ? { search: params.search }
        : {}),
      ...(params.isActive !== undefined
        ? { is_active: params.isActive }
        : {}),
      ...(params.status
        ? { status: params.status }
        : {}),
      ...(params.page !== undefined
        ? { page: params.page }
        : {}),
      ...(params.pageSize !== undefined
        ? { page_size: params.pageSize }
        : {}),
    },
  });

  return unwrapList(response);
}

export async function getStudent(studentId) {
  const response = await apiClient.get(
    `${BASE_URL}/${studentId}`,
  );

  return unwrap(response);
}

export async function createStudent(payload) {
  const response = await apiClient.post(
    BASE_URL,
    payload,
  );

  return unwrap(response);
}

export async function updateStudent(
  studentId,
  payload,
) {
  const response = await apiClient.patch(
    `${BASE_URL}/${studentId}`,
    payload,
  );

  return unwrap(response);
}

/* =========================================================
   STUDENT STATUS
========================================================= */

export async function updateStudentStatus(
  studentId,
  isActive,
) {
  const response = await apiClient.patch(
    `${BASE_URL}/${studentId}/status`,
    {
      is_active:
        typeof isActive === "object"
          ? isActive?.is_active
          : isActive,
    },
  );

  return unwrap(response);
}

/* =========================================================
   STUDENT PARENTS
========================================================= */

export async function getStudentParents(
  studentId,
) {
  const response = await apiClient.get(
    `${BASE_URL}/${studentId}/parents`,
  );

  return unwrapList(response);
}

export async function linkStudentParent(
  studentId,
  payload,
) {
  const response = await apiClient.post(
    `${BASE_URL}/${studentId}/parents`,
    payload,
  );

  return unwrap(response);
}

export async function unlinkStudentParent(
  studentId,
  parentId,
) {
  const response = await apiClient.delete(
    `${BASE_URL}/${studentId}/parents/${parentId}`,
  );

  return unwrap(response);
}

/* =========================================================
   BULK STATUS
========================================================= */

export async function bulkUpdateStudentStatus(
  payload,
) {
  const response = await apiClient.post(
    `${BASE_URL}/bulk-status`,
    payload,
  );

  return unwrap(response);
}