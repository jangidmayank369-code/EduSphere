
import apiClient from "./client";

const TRANSACTIONS_URL = "/accounting-transactions";
const ACCOUNTING_URL = "/accounting";

export async function listAccountingTransactions(params = {}) {
  const response = await apiClient.get(TRANSACTIONS_URL, { params });
  return response.data;
}

export async function createAccountingTransaction(payload) {
  const response = await apiClient.post(TRANSACTIONS_URL, payload);
  return response.data;
}

export async function voidAccountingTransaction(
  transactionId,
  params,
  payload
) {
  const response = await apiClient.post(
    `${TRANSACTIONS_URL}/${transactionId}/void`,
    payload,
    { params }
  );

  return response.data;
}

export async function getAccountingSummary(params = {}) {
  const response = await apiClient.get(
    `${ACCOUNTING_URL}/summary`,
    { params }
  );

  return response.data;
}

export async function listAccountingRecords(params = {}) {
  const response = await apiClient.get(
    `${ACCOUNTING_URL}/transactions`,
    { params }
  );

  return response.data;
}

export async function reconcileFeeAccounting(params = {}) {
  const response = await apiClient.get(
    `${TRANSACTIONS_URL}/reconciliation`,
    { params }
  );

  return response.data;
}
