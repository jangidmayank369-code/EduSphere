import apiClient from "./client";

const BASE_URL = "/student-fee-plans";

/* =========================================================
   LIST
========================================================= */

export async function listStudentFeePlans(params = {}) {
  const response = await apiClient.get(BASE_URL, {
    params,
  });

  return response.data;
}

/* =========================================================
   DETAIL
========================================================= */

export async function getStudentFeePlan(
  studentFeePlanId,
) {
  const response = await apiClient.get(
    `${BASE_URL}/${studentFeePlanId}`,
  );

  return response.data;
}

/* =========================================================
   CREATE
========================================================= */

export async function createStudentFeePlan(payload) {
  const response = await apiClient.post(
    BASE_URL,
    payload,
  );

  return response.data;
}

/* =========================================================
   BULK CREATE
========================================================= */

export async function bulkCreateStudentFeePlans(
  payload,
) {
  const response = await apiClient.post(
    `${BASE_URL}/bulk`,
    payload,
  );

  return response.data;
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateStudentFeePlan(
  studentFeePlanId,
  payload,
) {
  const response = await apiClient.patch(
    `${BASE_URL}/${studentFeePlanId}`,
    payload,
  );

  return response.data;
}

/* =========================================================
   RECALCULATE
========================================================= */

export async function recalculateStudentFeePlan(
  studentFeePlanId,
) {
  const response = await apiClient.post(
    `${BASE_URL}/${studentFeePlanId}/recalculate`,
  );

  return response.data;
}

/* =========================================================
   STATUS
========================================================= */

export async function updateStudentFeePlanStatus(
  studentFeePlanId,
  isActive,
) {
  const response = await apiClient.patch(
    `${BASE_URL}/${studentFeePlanId}/status`,
    {
      is_active: isActive,
    },
  );

  return response.data;
}