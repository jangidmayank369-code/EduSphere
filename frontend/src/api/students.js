
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const TOKEN_KEY = "edusphere_access_token";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const responseText = await response.text();
    data = responseText ? { detail: responseText } : null;
  }

  if (!response.ok) {
    const detail = data?.detail || data?.message;
    const error = new Error(
      typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function getHeaders({ json = true } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {};

  if (json) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

async function request(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders({ json: !isFormData }),
      ...options.headers,
    },
  });

  return parseResponse(response);
}

function queryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const result = search.toString();
  return result ? `?${result}` : "";
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.parents)) return data.parents;
  return [];
}

function unwrap(data) {
  return data?.data ?? data;
}

function normalizeStatus(status) {
  if (typeof status === "boolean") {
    return status ? "active" : "inactive";
  }

  const value = String(status ?? "").trim().toLowerCase();

  if (!["active", "inactive"].includes(value)) {
    throw new Error("Status must be active or inactive.");
  }

  return value;
}

export async function getStudents(params = {}) {
  const data = await request(`/students${queryString(params)}`);
  return normalizeList(unwrap(data));
}

export async function getStudent(studentId) {
  if (!studentId) throw new Error("Student ID is required.");

  const data = await request(
    `/students/${encodeURIComponent(studentId)}`
  );

  return unwrap(data);
}

export async function createStudent(payload) {
  const data = await request("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return unwrap(data);
}

export async function updateStudent(studentId, payload) {
  if (!studentId) throw new Error("Student ID is required.");

  const data = await request(
    `/students/${encodeURIComponent(studentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  return unwrap(data);
}

export async function deleteStudent(studentId) {
  if (!studentId) throw new Error("Student ID is required.");

  const data = await request(
    `/students/${encodeURIComponent(studentId)}`,
    { method: "DELETE" }
  );

  return unwrap(data);
}

export async function getStudentParents(studentId) {
  if (!studentId) throw new Error("Student ID is required.");

  const data = await request(
    `/students/${encodeURIComponent(studentId)}/parents`
  );

  return normalizeList(unwrap(data));
}

export async function updateStudentStatus(studentId, status) {
  if (!studentId) throw new Error("Student ID is required.");

  const data = await request(
    `/students/${encodeURIComponent(studentId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: normalizeStatus(status) }),
    }
  );

  return unwrap(data);
}

export async function bulkUpdateStudentStatus(studentIds, status) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error("Select at least one student.");
  }

  const uniqueIds = [...new Set(studentIds)];

  const data = await request("/students/bulk-status", {
    method: "PATCH",
    body: JSON.stringify({
      student_ids: uniqueIds,
      status: normalizeStatus(status),
    }),
  });

  return unwrap(data);
}

export async function importStudentsFromSession(payload) {
  if (!payload?.source_session || !payload?.target_session) {
    throw new Error("Source and target sessions are required.");
  }

  if (!Array.isArray(payload.students) || payload.students.length === 0) {
    throw new Error("Select at least one student to import.");
  }

  const data = await request("/students/import-from-session", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return unwrap(data);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

export async function bulkImportStudents(file) {
  if (!(file instanceof File)) {
    throw new Error("Choose a valid CSV file.");
  }

  const content = await file.text();
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file has no student rows.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim()
  );

  if (headers.some((header) => !header)) {
    throw new Error("CSV contains an empty column heading.");
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((record, header, index) => {
      record[header] = (values[index] ?? "").trim();
      return record;
    }, {});
  });

  const results = [];

  for (let index = 0; index < rows.length; index += 1) {
    try {
      const student = await createStudent(rows[index]);

      results.push({
        row: index + 2,
        success: true,
        data: student,
      });
    } catch (error) {
      results.push({
        row: index + 2,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    total: rows.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

export async function exportStudentsCsv(params = {}) {
  const students = await getStudents(params);

  if (students.length === 0) {
    throw new Error("No student records available to export.");
  }

  const columns = [
    "admission_number",
    "enrollment_number",
    "roll_number",
    "first_name",
    "middle_name",
    "last_name",
    "class_name",
    "section",
    "date_of_birth",
    "gender",
    "blood_group",
    "government_id_number",
    "house",
    "category",
    "religion",
    "previous_school",
    "admission_date",
    "phone",
    "email",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "status",
  ];

  const escapeCsv = (value) => {
    const text =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? "");

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.join(","),
    ...students.map((student) =>
      columns.map((column) => escapeCsv(student[column])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "edusphere-students.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return { exported: students.length };
}

export async function uploadStudentPhoto(studentId, file) {
  if (!studentId) throw new Error("Student ID is required.");

  if (!(file instanceof File)) {
    throw new Error("Choose a valid photo.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const data = await request(
    `/students/${encodeURIComponent(studentId)}/photo`,
    {
      method: "POST",
      body: formData,
    }
  );

  return unwrap(data);
}

export default {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentParents,
  updateStudentStatus,
  bulkUpdateStudentStatus,
  importStudentsFromSession,
  bulkImportStudents,
  exportStudentsCsv,
  uploadStudentPhoto,
};
