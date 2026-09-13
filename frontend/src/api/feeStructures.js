import apiClient from "./client";

const BASE_URL = "/fee-structures";

export async function listFeeStructures(params = {}) {
  const response = await apiClient.get(BASE_URL, { params });
  return response.data;
}

export async function getFeeStructure(feeStructureId) {
  const response = await apiClient.get(
    `${BASE_URL}/${feeStructureId}`,
  );
  return response.data;
}

export async function createFeeStructure(payload) {
  const response = await apiClient.post(BASE_URL, payload);
  return response.data;
}

export async function updateFeeStructure(feeStructureId, payload) {
  const response = await apiClient.patch(
    `${BASE_URL}/${feeStructureId}`,
    payload,
  );
  return response.data;
}

export async function updateFeeStructureStatus(
  feeStructureId,
  isActive,
) {
  const response = await apiClient.patch(
    `${BASE_URL}/${feeStructureId}/status`,
    {
      is_active: isActive,
    },
  );

  return response.data;
}