
import apiClient from "./client";

const BASE_URL = "/fee-payments";

export async function listFeePayments(params = {}) {
  const response = await apiClient.get(BASE_URL, {
    params,
  });

  return response.data;
}

export async function createFeePayment(payload) {
  const response = await apiClient.post(
    BASE_URL,
    payload,
  );

  return response.data;
}

export async function getFeePayment(paymentId, params = {}) {
  const response = await apiClient.get(
    `${BASE_URL}/${paymentId}`,
    { params },
  );

  return response.data;
}

export async function getFeePaymentReceipt(
  paymentId,
  params = {},
) {
  const response = await apiClient.get(
    `${BASE_URL}/${paymentId}/receipt`,
    { params },
  );

  return response.data;
}

export async function reverseFeePayment(
  paymentId,
  params,
  payload,
) {
  const response = await apiClient.post(
    `${BASE_URL}/${paymentId}/reverse`,
    payload,
    { params },
  );

  return response.data;
}
