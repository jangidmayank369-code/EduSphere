import apiClient from "./client";

function unwrap(response) {
  return response?.data?.data ?? response?.data;
}

// ============================================================================
// SCHOOL
// ============================================================================

export async function getSchools(params = {}) {
  const response = await apiClient.get("/schools", {
    params,
  });

  return unwrap(response);
}

export async function getSchool(schoolId) {
  const response = await apiClient.get(
    `/schools/${schoolId}`
  );

  return unwrap(response);
}

export async function createSchool(data) {
  const response = await apiClient.post(
    "/schools",
    data
  );

  return unwrap(response);
}

export async function updateSchool(
  schoolId,
  data
) {
  const response = await apiClient.patch(
    `/schools/${schoolId}`,
    data
  );

  return unwrap(response);
}

export async function updateSchoolStatus(
  schoolId,
  isActive
) {
  const response = await apiClient.patch(
    `/schools/${schoolId}/status`,
    {
      is_active: Boolean(isActive),
    }
  );

  return unwrap(response);
}

// ============================================================================
// ACADEMIC SESSIONS
// ============================================================================

export async function getAcademicSessions(
  schoolId,
  params = {}
) {
  const response = await apiClient.get(
    `/schools/${schoolId}/academic-sessions`,
    {
      params,
    }
  );

  return unwrap(response);
}

export async function getCurrentAcademicSession(
  schoolId
) {
  const response = await apiClient.get(
    `/schools/${schoolId}/academic-sessions/current`
  );

  return unwrap(response);
}

export async function getAcademicSession(
  sessionId
) {
  const response = await apiClient.get(
    `/schools/academic-sessions/${sessionId}`
  );

  return unwrap(response);
}

export async function createAcademicSession(
  schoolId,
  data
) {
  const response = await apiClient.post(
    `/schools/${schoolId}/academic-sessions`,
    data
  );

  return unwrap(response);
}

export async function updateAcademicSession(
  sessionId,
  data
) {
  const response = await apiClient.patch(
    `/schools/academic-sessions/${sessionId}`,
    data
  );

  return unwrap(response);
}

export async function setCurrentAcademicSession(
  sessionId
) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/set-current`
  );

  return unwrap(response);
}

export async function updateAcademicSessionStatus(
  sessionId,
  isActive
) {
  const response = await apiClient.patch(
    `/schools/academic-sessions/${sessionId}/status`,
    {
      is_active: Boolean(isActive),
    }
  );

  return unwrap(response);
}

// ============================================================================
// SESSION LIFECYCLE
// ============================================================================

export async function closeAcademicSession(
  sessionId
) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/close`
  );

  return unwrap(response);
}

export async function archiveAcademicSession(
  sessionId
) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/archive`
  );

  return unwrap(response);
}

export async function cloneAcademicSession(
  sessionId,
  data
) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/clone`,
    data
  );

  return unwrap(response);
}

export async function carryForwardAcademicSession(
  sessionId,
  data
) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/carry-forward`,
    data
  );

  return unwrap(response);
}