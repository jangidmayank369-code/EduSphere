import apiClient from "./client";

export async function getSchools(params = {}) {
  const response = await apiClient.get("/schools", { params });
  return response.data;
}

export async function getSchool(schoolId) {
  const response = await apiClient.get(`/schools/${schoolId}`);
  return response.data;
}

export async function createSchool(data) {
  const response = await apiClient.post("/schools", data);
  return response.data;
}

export async function updateSchool(schoolId, data) {
  const response = await apiClient.patch(`/schools/${schoolId}`, data);
  return response.data;
}

export async function updateSchoolStatus(schoolId, isActive) {
  const response = await apiClient.patch(`/schools/${schoolId}/status`, {
    is_active: isActive,
  });
  return response.data;
}

export async function getAcademicSessions(schoolId, params = {}) {
  const response = await apiClient.get(
    `/schools/${schoolId}/academic-sessions`,
    { params },
  );
  return response.data;
}

export async function getCurrentAcademicSession(schoolId) {
  const response = await apiClient.get(
    `/schools/${schoolId}/academic-sessions/current`,
  );
  return response.data;
}

export async function getAcademicSession(sessionId) {
  const response = await apiClient.get(
    `/schools/academic-sessions/${sessionId}`,
  );
  return response.data;
}

export async function createAcademicSession(schoolId, data) {
  const response = await apiClient.post(
    `/schools/${schoolId}/academic-sessions`,
    data,
  );
  return response.data;
}

export async function updateAcademicSession(sessionId, data) {
  const response = await apiClient.patch(
    `/schools/academic-sessions/${sessionId}`,
    data,
  );
  return response.data;
}

export async function setCurrentAcademicSession(sessionId) {
  const response = await apiClient.post(
    `/schools/academic-sessions/${sessionId}/set-current`,
  );
  return response.data;
}

export async function updateAcademicSessionStatus(sessionId, isActive) {
  const response = await apiClient.patch(
    `/schools/academic-sessions/${sessionId}/status`,
    {
      is_active: isActive,
    },
  );
  return response.data;
}