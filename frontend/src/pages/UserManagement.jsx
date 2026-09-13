import "../users.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUser,
  deleteUser,
  getUser,
  getUserRoles,
  getUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "../api/users";

const TEXT = {
  EN: {
    title: "User & Identity",
    subtitle:
      "Manage EduSphere accounts, access status and identity records.",
    users: "Users",
    search: "Search users",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    refresh: "Refresh",
    add: "Create User",
    name: "Full name",
    email: "Email",
    password: "Password",
    role: "Role",
    selectRole: "Select role",
    noRoles: "No active roles available.",
    status: "Status",
    roles: "Roles",
    actions: "Actions",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    reset: "Reset Password",
    delete: "Delete",
    save: "Save User",
    cancel: "Cancel",
    createHeading: "Create user",
    editHeading: "Edit user",
    resetHeading: "Reset password",
    noUsers: "No users found.",
    loading: "Loading users…",
    loadingRoles: "Loading roles…",
    saving: "Saving…",
    deleting: "Deleting…",
    confirmDelete:
      "Delete this user? This action cannot be undone.",
    confirmStatus: "Change this user's active status?",
    passwordHint: "Minimum 8 characters.",
    created: "User created successfully.",
    updated: "User updated successfully.",
    statusChanged: "User status updated.",
    passwordChanged: "Password reset successfully.",
    deleted: "User deleted successfully.",
    error: "Something went wrong. Please try again.",
    close: "Close",
    details: "User details",
    id: "User ID",
    createdAt: "Created",
    updatedAt: "Updated",
    records: "records",
    identity: "IDENTITY / RBAC",
  },

  HI: {
    title: "यूज़र और पहचान",
    subtitle:
      "EduSphere खातों, एक्सेस स्थिति और पहचान रिकॉर्ड प्रबंधित करें।",
    users: "यूज़र",
    search: "यूज़र खोजें",
    all: "सभी",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    refresh: "रिफ्रेश",
    add: "यूज़र बनाएँ",
    name: "पूरा नाम",
    email: "ईमेल",
    password: "पासवर्ड",
    role: "भूमिका",
    selectRole: "भूमिका चुनें",
    noRoles: "कोई सक्रिय भूमिका उपलब्ध नहीं है।",
    status: "स्थिति",
    roles: "भूमिकाएँ",
    actions: "कार्रवाई",
    edit: "संपादित करें",
    activate: "सक्रिय करें",
    deactivate: "निष्क्रिय करें",
    reset: "पासवर्ड रीसेट",
    delete: "डिलीट",
    save: "यूज़र सेव करें",
    cancel: "रद्द करें",
    createHeading: "यूज़र बनाएँ",
    editHeading: "यूज़र संपादित करें",
    resetHeading: "पासवर्ड रीसेट",
    noUsers: "कोई यूज़र नहीं मिला।",
    loading: "यूज़र लोड हो रहे हैं…",
    loadingRoles: "भूमिकाएँ लोड हो रही हैं…",
    saving: "सेव हो रहा है…",
    deleting: "डिलीट हो रहा है…",
    confirmDelete:
      "क्या इस यूज़र को डिलीट करना है? यह कार्रवाई वापस नहीं होगी।",
    confirmStatus: "क्या यूज़र की सक्रिय स्थिति बदलनी है?",
    passwordHint: "कम से कम 8 अक्षर।",
    created: "यूज़र सफलतापूर्वक बनाया गया।",
    updated: "यूज़र सफलतापूर्वक अपडेट हुआ।",
    statusChanged: "यूज़र की स्थिति अपडेट हुई।",
    passwordChanged: "पासवर्ड सफलतापूर्वक रीसेट हुआ।",
    deleted: "यूज़र सफलतापूर्वक डिलीट हुआ।",
    error: "कुछ गलत हुआ। कृपया फिर प्रयास करें।",
    close: "बंद करें",
    details: "यूज़र विवरण",
    id: "यूज़र ID",
    createdAt: "बनाया गया",
    updatedAt: "अपडेट किया गया",
    records: "रिकॉर्ड",
    identity: "पहचान / RBAC",
  },
};

function unwrap(value) {
  return value?.data ?? value;
}

function getError(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.detail ||
    fallback
  );
}

function formatDate(value, language) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "HI" ? "hi-IN" : "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export default function UserManagement() {
  const [language, setLanguage] = useState(
    localStorage.getItem("edusphere_language") === "HI"
      ? "HI"
      : "EN",
  );

  const t = TEXT[language];

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role_id: "",
  });

  const [password, setPassword] = useState("");

  useEffect(() => {
    const onLanguageChange = (event) => {
      setLanguage(event.detail === "HI" ? "HI" : "EN");
    };

    window.addEventListener(
      "edusphere-language-change",
      onLanguageChange,
    );

    return () =>
      window.removeEventListener(
        "edusphere-language-change",
        onLanguageChange,
      );
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);

    try {
      const result = unwrap(await getUserRoles());

      const rows = Array.isArray(result)
        ? result
        : result?.items ||
          result?.results ||
          [];

      setRoles(
        rows.filter(
          (role) => role?.is_active !== false,
        ),
      );
    } catch {
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = unwrap(
        await getUsers({
          page,
          page_size: pageSize,
          search: search.trim() || undefined,
          status_filter:
            statusFilter || undefined,
        }),
      );

      const rows = Array.isArray(result)
        ? result
        : result?.items ||
          result?.results ||
          [];

      setUsers(rows);
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    search,
    statusFilter,
    t.error,
  ]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const timer = setTimeout(
      loadUsers,
      250,
    );

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter(
        (user) => user.is_active,
      ).length,
      inactive: users.filter(
        (user) => !user.is_active,
      ).length,
    }),
    [users],
  );

  function openCreate() {
    setForm({
      full_name: "",
      email: "",
      password: "",
      role_id: "",
    });

    setSelected(null);
    setModal("create");
    setError("");
    setNotice("");

    loadRoles();
  }

  function openEdit(user) {
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role_id: user.role_id || "",
    });

    setSelected(user);
    setModal("edit");
    setError("");
    setNotice("");

    loadRoles();
  }

  async function openDetails(user) {
    setError("");
    setNotice("");

    try {
      const result = unwrap(
        await getUser(user.id),
      );

      setSelected(result);
      setModal("details");
    } catch (err) {
      setError(getError(err, t.error));
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    setWorking(true);
    setError("");
    setNotice("");

    try {
      if (modal === "create") {
        await createUser({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role_id: Number(form.role_id),
        });

        setNotice(t.created);
      } else {
        await updateUser(selected.id, {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          role_id: form.role_id
            ? Number(form.role_id)
            : undefined,
        });

        setNotice(t.updated);
      }

      setModal(null);
      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  async function handleStatus(user) {
    if (!window.confirm(t.confirmStatus)) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await updateUserStatus(
        user.id,
        !user.is_active,
      );

      setNotice(t.statusChanged);

      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await deleteUser(user.id);

      setNotice(t.deleted);

      if (selected?.id === user.id) {
        setSelected(null);
      }

      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  async function handlePassword(event) {
    event.preventDefault();

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await resetUserPassword(
        selected.id,
        password,
      );

      setPassword("");
      setModal(null);
      setNotice(t.passwordChanged);
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="users-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            {t.identity}
          </div>

          <h1>{t.title}</h1>

          <p>{t.subtitle}</p>
        </div>

        <button
          className="primary-button"
          onClick={openCreate}
          disabled={working}
        >
          + {t.add}
        </button>
      </div>

      <div className="users-stat-grid">
        <Stat
          label={t.users}
          value={stats.total}
        />

        <Stat
          label={t.active}
          value={stats.active}
        />

        <Stat
          label={t.inactive}
          value={stats.inactive}
        />
      </div>

      <div className="users-toolbar">
        <div className="users-search">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder={t.search}
          />
        </div>

        <div className="filter-group">
          {[
            ["", t.all],
            ["active", t.active],
            ["inactive", t.inactive],
          ].map(([value, label]) => (
            <button
              key={value || "all"}
              className={
                statusFilter === value
                  ? "filter-active"
                  : ""
              }
              onClick={() => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className="secondary-button"
          onClick={loadUsers}
          disabled={loading}
        >
          ↻ {t.refresh}
        </button>
      </div>

      {(error || notice) && (
        <div
          className={
            error
              ? "users-alert error"
              : "users-alert success"
          }
        >
          {error || notice}
        </div>
      )}

      <div className="users-card">
        <div className="users-card-heading">
          <div>
            <h2>{t.users}</h2>

            <span>
              {users.length} {t.records}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="users-empty">
            {t.loading}
          </div>
        ) : users.length === 0 ? (
          <div className="users-empty">
            {t.noUsers}
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.email}</th>
                  <th>{t.roles}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <button
                        className="user-name-button"
                        onClick={() =>
                          openDetails(user)
                        }
                      >
                        <span className="user-avatar">
                          {(
                            user.full_name || "?"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span>
                          <strong>
                            {user.full_name}
                          </strong>

                          <small>
                            {t.id} #{user.id}
                          </small>
                        </span>
                      </button>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <div className="role-list">
                        {(user.roles || [])
                          .length ? (
                          user.roles.map(
                            (role) => (
                              <span
                                className="role-chip"
                                key={role}
                              >
                                {role}
                              </span>
                            ),
                          )
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-chip ${
                          user.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {user.is_active
                          ? t.active
                          : t.inactive}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() =>
                            openEdit(user)
                          }
                        >
                          {t.edit}
                        </button>

                        <button
                          onClick={() =>
                            handleStatus(user)
                          }
                        >
                          {user.is_active
                            ? t.deactivate
                            : t.activate}
                        </button>

                        <button
                          onClick={() => {
                            setSelected(user);
                            setPassword("");
                            setModal("password");
                            setError("");
                            setNotice("");
                          }}
                        >
                          {t.reset}
                        </button>

                        <button
                          className="danger-text"
                          onClick={() =>
                            handleDelete(user)
                          }
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !working && setModal(null)
          }
        >
          <div
            className="users-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  {t.identity}
                </span>

                <h2>
                  {modal === "create"
                    ? t.createHeading
                    : modal === "edit"
                      ? t.editHeading
                      : modal === "password"
                        ? t.resetHeading
                        : t.details}
                </h2>
              </div>

              <button
                onClick={() =>
                  !working && setModal(null)
                }
              >
                ×
              </button>
            </div>

            {modal === "details" ? (
              <div className="user-details">
                <Detail
                  label={t.id}
                  value={`#${selected?.id}`}
                />

                <Detail
                  label={t.name}
                  value={selected?.full_name}
                />

                <Detail
                  label={t.email}
                  value={selected?.email}
                />

                <Detail
                  label={t.roles}
                  value={
                    selected?.roles?.length
                      ? selected.roles.join(", ")
                      : "—"
                  }
                />

                <Detail
                  label={t.status}
                  value={
                    selected?.is_active
                      ? t.active
                      : t.inactive
                  }
                />

                <Detail
                  label={t.createdAt}
                  value={formatDate(
                    selected?.created_at,
                    language,
                  )}
                />

                <Detail
                  label={t.updatedAt}
                  value={formatDate(
                    selected?.updated_at,
                    language,
                  )}
                />

                <button
                  className="secondary-button full-width"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  {t.close}
                </button>
              </div>
            ) : modal === "password" ? (
              <form
                onSubmit={handlePassword}
                className="user-form"
              >
                <label>
                  {t.password}

                  <input
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder={t.passwordHint}
                    required
                  />
                </label>

                <div className="form-hint">
                  {t.passwordHint}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setModal(null)
                    }
                    disabled={working}
                  >
                    {t.cancel}
                  </button>

                  <button
                    className="primary-button"
                    disabled={working}
                  >
                    {working
                      ? t.saving
                      : t.reset}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleSave}
                className="user-form"
              >
                <label>
                  {t.name}

                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        full_name:
                          event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  {t.email}

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email:
                          event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  {t.role}

                  <select
                    value={form.role_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role_id:
                          event.target.value,
                      }))
                    }
                    required={modal === "create"}
                    disabled={
                      rolesLoading || working
                    }
                  >
                    <option value="">
                      {rolesLoading
                        ? t.loadingRoles
                        : t.selectRole}
                    </option>

                    {roles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>

                  {!rolesLoading &&
                    !roles.length && (
                      <div className="form-hint">
                        {t.noRoles}
                      </div>
                    )}
                </label>

                {modal === "create" && (
                  <label>
                    {t.password}

                    <input
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password:
                            event.target.value,
                        }))
                      }
                      placeholder={
                        t.passwordHint
                      }
                      required
                    />
                  </label>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setModal(null)
                    }
                    disabled={working}
                  >
                    {t.cancel}
                  </button>

                  <button
                    className="primary-button"
                    disabled={
                      working ||
                      (modal === "create" &&
                        !form.role_id)
                    }
                  >
                    {working
                      ? t.saving
                      : t.save}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {working && (
        <div className="working-indicator">
          {t.saving}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="users-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}