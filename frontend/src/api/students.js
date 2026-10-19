
import apiClient from "./client";

const BASE_URL = "/students";

function unwrapResponse(response) {
  return response?.data ?? response;
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || JSON.stringify(item))
      .join(", ");
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong"
  );
}

export async function getStudents(params = {}) {
  try {
    const response = await apiClient.get(BASE_URL, { params });
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getStudent(studentId) {
  try {
    const response = await apiClient.get(
      `${BASE_URL}/${encodeURIComponent(studentId)}`
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function createStudent(payload) {
  try {
    const response = await apiClient.post(BASE_URL, payload);
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateStudent(studentId, payload) {
  try {
    const response = await apiClient.patch(
      `${BASE_URL}/${encodeURIComponent(studentId)}`,
      payload
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function updateStudentStatus(studentId, payload) {
  try {
    const response = await apiClient.patch(
      `${BASE_URL}/${encodeURIComponent(studentId)}/status`,
      payload
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function bulkUpdateStudentStatus(payload) {
  try {
    const response = await apiClient.patch(
      `${BASE_URL}/bulk-status`,
      payload
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getStudentParents(studentId) {
  try {
    const response = await apiClient.get(
      `${BASE_URL}/${encodeURIComponent(studentId)}/parents`
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function linkStudentParent(studentId, payload) {
  try {
    const response = await apiClient.post(
      `${BASE_URL}/${encodeURIComponent(studentId)}/parents`,
      payload
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function unlinkStudentParent(studentId, parentId) {
  try {
    const response = await apiClient.delete(
      `${BASE_URL}/${encodeURIComponent(studentId)}/parents/${encodeURIComponent(parentId)}`
    );
    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function uploadStudentPhoto(studentId, file) {
  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  if (!file || typeof file !== "object" || typeof file.name !== "string") {
    throw new Error("Please select a photo.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG and WebP photos are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Photo must not exceed 5 MB.");
  }

  const formData = new FormData();
  formData.append("photo", file, file.name);

  try {
    const response = await apiClient.post(
      `${BASE_URL}/${encodeURIComponent(studentId)}/photo`,
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
      }
    );

    return unwrapResponse(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
