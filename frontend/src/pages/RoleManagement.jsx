import "../roles.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import apiClient from "../api/client";
import { useAuth } from "../auth/AuthContext";

const TEXT = {
  EN: {
    eyebrow: "IDENTITY / RBAC",
    title: "Roles & Permissions",
    subtitle:
      "Create, manage and control access roles across EduSphere.",

    create: "Create Role",
    edit: "Edit Role",
    delete: "Delete",
    save: "Save Role",
    cancel: "Cancel",
    refresh: "Refresh",

    roleName: "Role Name",
    description: "Description",
    permissions: "Permissions",
    selected: "selected",
    users: "Users",

    searchRoles: "Search roles",
    searchPermissions: "Search permissions",

    selectAll: "Select All",
    clearAll: "Clear All",

    loading: "Loading...",
    saving: "Saving...",
    noRoles: "No roles found.",
    noPermissions: "No permissions available.",
    noMatchingPermissions:
      "No matching permissions found.",

    createRole: "Create Role",
    editRole: "Edit Role",

    createSuccess:
      "Role created successfully.",
    updateSuccess:
      "Role updated successfully.",
    deleteSuccess:
      "Role deleted successfully.",

    error:
      "Unable to complete the operation.",

    confirmDelete:
      "Are you sure you want to delete this role?",

    totalRoles: "Total Roles",
    totalPermissions: "Total Permissions",

    selectedRole: "Selected Role",

    chooseRole:
      "Select a role from the list or create a new one.",

    createHint:
      "Create a new access role and assign the permissions it should have.",
  },

  HI: {
    eyebrow: "पहचान / RBAC",
    title: "भूमिकाएँ और अनुमतियाँ",
    subtitle:
      "EduSphere में भूमिकाएँ बनाएँ और एक्सेस नियंत्रित करें।",

    create: "भूमिका बनाएँ",
    edit: "भूमिका संपादित करें",
    delete: "हटाएँ",
    save: "भूमिका सेव करें",
    cancel: "रद्द करें",
    refresh: "रिफ्रेश",

    roleName: "भूमिका का नाम",
    description: "विवरण",
    permissions: "अनुमतियाँ",
    selected: "चयनित",
    users: "यूज़र",

    searchRoles: "भूमिकाएँ खोजें",
    searchPermissions: "अनुमतियाँ खोजें",

    selectAll: "सभी चुनें",
    clearAll: "सभी हटाएँ",

    loading: "लोड हो रहा है...",
    saving: "सेव हो रहा है...",
    noRoles: "कोई भूमिका नहीं मिली।",
    noPermissions: "कोई अनुमति उपलब्ध नहीं है।",
    noMatchingPermissions:
      "कोई matching अनुमति नहीं मिली।",

    createRole: "भूमिका बनाएँ",
    editRole: "भूमिका संपादित करें",

    createSuccess:
      "भूमिका सफलतापूर्वक बनाई गई।",
    updateSuccess:
      "भूमिका सफलतापूर्वक अपडेट की गई।",
    deleteSuccess:
      "भूमिका सफलतापूर्वक हटा दी गई।",

    error:
      "ऑपरेशन पूरा नहीं हो सका।",

    confirmDelete:
      "क्या आप इस भूमिका को हटाना चाहते हैं?",

    totalRoles: "कुल भूमिकाएँ",
    totalPermissions: "कुल अनुमतियाँ",

    selectedRole: "चयनित भूमिका",

    chooseRole:
      "सूची से भूमिका चुनें या नई भूमिका बनाएँ।",

    createHint:
      "नई एक्सेस भूमिका बनाएँ और उसकी अनुमतियाँ चुनें।",
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function unwrap(response) {
  return (
    response?.data?.data ??
    response?.data
  );
}

function normalizeList(response) {
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

function getErrorMessage(
  error,
  fallback,
) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.detail ||
    fallback
  );
}

function getPermissionCode(
  permission,
) {
  return (
    permission?.code ||
    permission?.name ||
    `PERMISSION_${permission?.id}`
  );
}

function getRolePermissionIds(role) {
  if (
    Array.isArray(
      role?.permission_ids,
    )
  ) {
    return role.permission_ids.map(
      Number,
    );
  }

  if (
    Array.isArray(
      role?.permissions,
    )
  ) {
    return role.permissions
      .map(
        (permission) =>
          permission?.id,
      )
      .filter(Boolean)
      .map(Number);
  }

  return [];
}

function getPermissionGroup(code) {
  const value = String(
    code || "",
  );

  const index =
    value.indexOf("_");

  if (index === -1) {
    return value;
  }

  return value.slice(
    0,
    index,
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function RoleManagement() {
  const { hasPermission } =
    useAuth();

  // ---------------------------------------------------------------------------
  // Language
  // ---------------------------------------------------------------------------

  const [language, setLanguage] =
    useState(() => {
      return (
        localStorage.getItem(
          "edusphere-language",
        ) ||
        localStorage.getItem(
          "edusphere_language",
        ) ||
        "EN"
      );
    });

  const t =
    TEXT[language] || TEXT.EN;

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const [roles, setRoles] =
    useState([]);

  const [
    permissions,
    setPermissions,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // ---------------------------------------------------------------------------
  // IMPORTANT:
  // Create mode is now separate from Edit mode.
  // ---------------------------------------------------------------------------

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    editingRole,
    setEditingRole,
  ] = useState(null);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const [
    roleSearch,
    setRoleSearch,
  ] = useState("");

  const [
    permissionSearch,
    setPermissionSearch,
  ] = useState("");

  const [
    expandedGroups,
    setExpandedGroups,
  ] = useState({});

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const [form, setForm] =
    useState({
      name: "",
      description: "",
      permission_ids: [],
    });

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  const canCreate =
    hasPermission(
      "RBAC_ROLE_CREATE",
    );

  const canUpdate =
    hasPermission(
      "RBAC_ROLE_UPDATE",
    );

  const canDelete =
    hasPermission(
      "RBAC_ROLE_DELETE",
    );

  const canAssign =
    hasPermission(
      "RBAC_PERMISSION_ASSIGN",
    );

  // ---------------------------------------------------------------------------
  // Language listener
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleLanguageChange =
      (event) => {
        const next =
          event.detail === "HI" ||
          event.detail === "EN"
            ? event.detail
            : localStorage.getItem(
                  "edusphere-language",
                ) ||
                localStorage.getItem(
                  "edusphere_language",
                ) ||
                "EN";

        setLanguage(next);
      };

    window.addEventListener(
      "edusphere-language-change",
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        handleLanguageChange,
      );
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Load Roles + Permissions
  // ---------------------------------------------------------------------------

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          rolesResponse,
          permissionsResponse,
        ] = await Promise.all([
          apiClient.get(
            "/rbac/roles",
          ),
          apiClient.get(
            "/rbac/permissions",
          ),
        ]);

        const nextRoles =
          normalizeList(
            rolesResponse,
          );

        const nextPermissions =
          normalizeList(
            permissionsResponse,
          );

        setRoles(nextRoles);
        setPermissions(
          nextPermissions,
        );
      } catch (requestError) {
        console.error(
          "Failed to load RBAC data:",
          requestError,
        );

        setError(
          getErrorMessage(
            requestError,
            t.error,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [t.error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Filter Roles
  // ---------------------------------------------------------------------------

  const filteredRoles =
    useMemo(() => {
      const search =
        roleSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return roles;
      }

      return roles.filter(
        (role) =>
          [
            role?.name,
            role?.description,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(search),
            ),
      );
    }, [
      roles,
      roleSearch,
    ]);

  // ---------------------------------------------------------------------------
  // Group Permissions
  // ---------------------------------------------------------------------------

  const permissionGroups =
    useMemo(() => {
      const search =
        permissionSearch
          .trim()
          .toLowerCase();

      const filtered =
        permissions.filter(
          (permission) => {
            if (!search) {
              return true;
            }

            const code =
              getPermissionCode(
                permission,
              );

            return [
              code,
              permission?.description,
              permission?.name,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(search),
              );
          },
        );

      const groups = {};

      filtered.forEach(
        (permission) => {
          const code =
            getPermissionCode(
              permission,
            );

          const group =
            getPermissionGroup(
              code,
            ) || "OTHER";

          if (!groups[group]) {
            groups[group] = [];
          }

          groups[group].push(
            permission,
          );
        },
      );

      return Object.entries(
        groups,
      )
        .sort(
          ([a], [b]) =>
            a.localeCompare(b),
        )
        .map(
          ([name, items]) => ({
            name,
            items,
          }),
        );
    }, [
      permissions,
      permissionSearch,
    ]);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  function resetForm() {
    setEditingRole(null);
    setIsCreating(false);

    setForm({
      name: "",
      description: "",
      permission_ids: [],
    });

    setPermissionSearch("");
    setError("");
  }

  // ---------------------------------------------------------------------------
  // CREATE MODE
  // ---------------------------------------------------------------------------

  function startCreate() {
    if (!canCreate) {
      return;
    }

    setEditingRole(null);
    setIsCreating(true);

    setForm({
      name: "",
      description: "",
      permission_ids: [],
    });

    setPermissionSearch("");
    setError("");
    setMessage("");
  }

  // ---------------------------------------------------------------------------
  // EDIT MODE
  // ---------------------------------------------------------------------------

  function startEdit(role) {
    if (!role) {
      return;
    }

    setIsCreating(false);
    setEditingRole(role);

    setForm({
      name: role?.name || "",
      description:
        role?.description || "",
      permission_ids:
        getRolePermissionIds(
          role,
        ),
    });

    setPermissionSearch("");
    setError("");
    setMessage("");
  }

  // ---------------------------------------------------------------------------
  // Permission toggle
  // ---------------------------------------------------------------------------

  function togglePermission(
    permissionId,
  ) {
    if (!canAssign) {
      return;
    }

    const numericId =
      Number(permissionId);

    setForm((current) => {
      const exists =
        current.permission_ids.includes(
          numericId,
        );

      return {
        ...current,
        permission_ids: exists
          ? current.permission_ids.filter(
              (id) =>
                id !== numericId,
            )
          : [
              ...current.permission_ids,
              numericId,
            ],
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Select all permissions
  // ---------------------------------------------------------------------------

  function selectAllPermissions() {
    if (!canAssign) {
      return;
    }

    setForm((current) => ({
      ...current,
      permission_ids:
        permissions.map(
          (permission) =>
            Number(
              permission.id,
            ),
        ),
    }));
  }

  // ---------------------------------------------------------------------------
  // Clear all permissions
  // ---------------------------------------------------------------------------

  function clearAllPermissions() {
    if (!canAssign) {
      return;
    }

    setForm((current) => ({
      ...current,
      permission_ids: [],
    }));
  }

  // ---------------------------------------------------------------------------
  // Group permission selection
  // ---------------------------------------------------------------------------

  function selectGroupPermissions(
    groupPermissions,
  ) {
    if (!canAssign) {
      return;
    }

    const ids =
      groupPermissions.map(
        (permission) =>
          Number(
            permission.id,
          ),
      );

    setForm((current) => {
      const selected =
        new Set(
          current.permission_ids,
        );

      const allSelected =
        ids.length > 0 &&
        ids.every((id) =>
          selected.has(id),
        );

      if (allSelected) {
        ids.forEach((id) =>
          selected.delete(id),
        );
      } else {
        ids.forEach((id) =>
          selected.add(id),
        );
      }

      return {
        ...current,
        permission_ids:
          Array.from(selected),
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Toggle permission group
  // ---------------------------------------------------------------------------

  function toggleGroup(
    groupName,
  ) {
    setExpandedGroups(
      (current) => ({
        ...current,
        [groupName]:
          current[groupName] ===
          false,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // SAVE / CREATE / UPDATE
  // ---------------------------------------------------------------------------

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    const name =
      form.name.trim();

    if (!name) {
      setError(
        language === "HI"
          ? "भूमिका का नाम आवश्यक है।"
          : "Role name is required.",
      );

      return;
    }

    const isEdit =
      Boolean(editingRole);

    const isCreate =
      isCreating && !editingRole;

    if (
      isEdit &&
      !canUpdate
    ) {
      setError(t.error);
      return;
    }

    if (
      isCreate &&
      !canCreate
    ) {
      setError(t.error);
      return;
    }

    if (
      !isEdit &&
      !isCreate
    ) {
      setError(
        language === "HI"
          ? "कृपया पहले Create Role या किसी Role को चुनें।"
          : "Please choose Create Role or select an existing role.",
      );

      return;
    }

    if (
      !canAssign &&
      form.permission_ids.length >
        0
    ) {
      setError(
        language === "HI"
          ? "आपको अनुमतियाँ बदलने की अनुमति नहीं है।"
          : "You do not have permission to change permissions.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name,
        description:
          form.description.trim() ||
          null,
        permission_ids:
          form.permission_ids.map(
            Number,
          ),
      };

      // -----------------------------------------------------------------------
      // CREATE
      // -----------------------------------------------------------------------

      if (isCreate) {
        const response =
          await apiClient.post(
            "/rbac/roles",
            payload,
          );

        const createdRole =
          unwrap(response);

        setMessage(
          t.createSuccess,
        );

        // Refresh first so the new role is definitely present.
        await loadData();

        // Select the newly-created role if the API returned it.
        if (
          createdRole?.id
        ) {
          setEditingRole(
            createdRole,
          );
          setIsCreating(false);

          setForm({
            name:
              createdRole.name ||
              name,
            description:
              createdRole.description ||
              form.description.trim(),
            permission_ids:
              getRolePermissionIds(
                createdRole,
              ),
          });
        } else {
          // If backend does not return the created object,
          // find it from refreshed list.
          const refreshedRole =
            roles.find(
              (role) =>
                String(
                  role?.name,
                ).toLowerCase() ===
                name.toLowerCase(),
            );

          if (
            refreshedRole
          ) {
            setEditingRole(
              refreshedRole,
            );
            setIsCreating(false);

            setForm({
              name:
                refreshedRole.name ||
                name,
              description:
                refreshedRole.description ||
                "",
              permission_ids:
                getRolePermissionIds(
                  refreshedRole,
                ),
            });
          } else {
            setEditingRole(
              null,
            );
            setIsCreating(
              false,
            );

            setForm({
              name: "",
              description: "",
              permission_ids: [],
            });
          }
        }

        return;
      }

      // -----------------------------------------------------------------------
      // UPDATE
      // -----------------------------------------------------------------------

      if (isEdit) {
        const response =
          await apiClient.patch(
            `/rbac/roles/${editingRole.id}`,
            payload,
          );

        const updatedRole =
          unwrap(response);

        setMessage(
          t.updateSuccess,
        );

        await loadData();

        if (
          updatedRole?.id
        ) {
          setEditingRole(
            updatedRole,
          );

          setIsCreating(
            false,
          );

          setForm({
            name:
              updatedRole.name ||
              name,
            description:
              updatedRole.description ||
              form.description.trim(),
            permission_ids:
              getRolePermissionIds(
                updatedRole,
              ),
          });
        } else {
          setEditingRole(
            null,
          );

          setIsCreating(
            false,
          );

          setForm({
            name: "",
            description: "",
            permission_ids: [],
          });
        }
      }
    } catch (requestError) {
      console.error(
        "Failed to save role:",
        requestError,
      );

      setError(
        getErrorMessage(
          requestError,
          t.error,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  async function handleDelete(
    role,
  ) {
    if (!canDelete) {
      return;
    }

    if (!role?.id) {
      return;
    }

    if (
      !window.confirm(
        t.confirmDelete,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiClient.delete(
        `/rbac/roles/${role.id}`,
      );

      setMessage(
        t.deleteSuccess,
      );

      if (
        editingRole?.id ===
        role.id
      ) {
        resetForm();
      }

      await loadData();
    } catch (requestError) {
      console.error(
        "Failed to delete role:",
        requestError,
      );

      setError(
        getErrorMessage(
          requestError,
          t.error,
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const editorMode =
    isCreating
      ? "create"
      : editingRole
        ? "edit"
        : "empty";

  return (
    <section className="role-management-page">
      {/* ------------------------------------------------------------------- */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------- */}

      <div className="role-page-header">
        <div>
          <span className="page-eyebrow">
            {t.eyebrow}
          </span>

          <h1>{t.title}</h1>

          <p>{t.subtitle}</p>
        </div>

        <div className="role-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
            disabled={
              loading ||
              saving
            }
          >
            ↻ {t.refresh}
          </button>

          {canCreate && (
            <button
              type="button"
              className={`primary-button ${
                isCreating
                  ? "active"
                  : ""
              }`}
              onClick={
                startCreate
              }
              disabled={saving}
            >
              + {t.create}
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Alerts                                                              */}
      {/* ------------------------------------------------------------------- */}

      {(message || error) && (
        <div
          className={
            error
              ? "role-alert error"
              : "role-alert success"
          }
        >
          {error || message}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Stats                                                               */}
      {/* ------------------------------------------------------------------- */}

      <div className="role-stat-grid">
        <div className="role-stat-card">
          <span>
            {t.totalRoles}
          </span>

          <strong>
            {roles.length}
          </strong>
        </div>

        <div className="role-stat-card">
          <span>
            {t.totalPermissions}
          </span>

          <strong>
            {permissions.length}
          </strong>
        </div>

        <div className="role-stat-card">
          <span>
            {t.selectedRole}
          </span>

          <strong>
            {isCreating
              ? t.createRole
              : editingRole
                ? editingRole.name
                : "—"}
          </strong>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Main Layout                                                         */}
      {/* ------------------------------------------------------------------- */}

      <div className="role-layout">
        {/* ================================================================= */}
        {/* ROLES                                                              */}
        {/* ================================================================= */}

        <aside className="roles-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">
                {t.users}
              </span>

              <h2>
                {t.title}
              </h2>
            </div>

            <span className="panel-count">
              {roles.length}
            </span>
          </div>

          <div className="role-search">
            <span>⌕</span>

            <input
              type="text"
              value={roleSearch}
              onChange={(
                event,
              ) =>
                setRoleSearch(
                  event.target
                    .value,
                )
              }
              placeholder={
                t.searchRoles
              }
            />
          </div>

          {loading ? (
            <div className="role-empty">
              {t.loading}
            </div>
          ) : filteredRoles.length ===
            0 ? (
            <div className="role-empty">
              {t.noRoles}
            </div>
          ) : (
            <div className="role-list">
              {filteredRoles.map(
                (role) => {
                  const selected =
                    !isCreating &&
                    editingRole?.id ===
                      role.id;

                  const permissionCount =
                    getRolePermissionIds(
                      role,
                    ).length;

                  return (
                    <article
                      key={
                        role.id
                      }
                      className={`role-item ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="role-select"
                        onClick={() =>
                          startEdit(
                            role,
                          )
                        }
                      >
                        <span className="role-icon">
                          {(
                            role?.name ||
                            "R"
                          )
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </span>

                        <span className="role-copy">
                          <strong>
                            {
                              role.name
                            }
                          </strong>

                          <small>
                            {role.description ||
                              "—"}
                          </small>

                          <em>
                            {
                              permissionCount
                            }{" "}
                            {
                              t.permissions
                            }
                          </em>
                        </span>
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          className="danger-icon-button"
                          onClick={() =>
                            handleDelete(
                              role,
                            )
                          }
                          title={
                            t.delete
                          }
                        >
                          ×
                        </button>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </aside>

        {/* ================================================================= */}
        {/* EDITOR                                                             */}
        {/* ================================================================= */}

        <main className="role-editor">
          <div className="editor-heading">
            <div>
              <span className="panel-eyebrow">
                {t.accessSummary}
              </span>

              <h2>
                {editorMode ===
                "create"
                  ? t.createRole
                  : editorMode ===
                      "edit"
                    ? t.editRole
                    : t.createRole}
              </h2>
            </div>

            {isCreating && (
              <span className="selected-role-badge">
                {t.createRole}
              </span>
            )}

            {editingRole &&
              !isCreating && (
                <span className="selected-role-badge">
                  {
                    editingRole.name
                  }
                </span>
              )}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* Empty state                                                      */}
          {/* --------------------------------------------------------------- */}

          {editorMode ===
            "empty" && (
            <div className="editor-intro">
              <div className="editor-intro-icon">
                +
              </div>

              <h3>
                {t.createRole}
              </h3>

              <p>
                {t.chooseRole}
              </p>

              {canCreate && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    startCreate
                  }
                  disabled={
                    saving
                  }
                >
                  + {t.create}
                </button>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* CREATE / EDIT FORM                                               */}
          {/* --------------------------------------------------------------- */}

          {(editorMode ===
            "create" ||
            editorMode ===
              "edit") && (
            <form
              onSubmit={
                handleSubmit
              }
            >
              {/* ----------------------------------------------------------- */}
              {/* Role details                                                  */}
              {/* ----------------------------------------------------------- */}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="role-name">
                    {t.roleName}
                  </label>

                  <input
                    id="role-name"
                    type="text"
                    value={
                      form.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          name: event
                            .target
                            .value,
                        }),
                      )
                    }
                    maxLength={
                      100
                    }
                    disabled={
                      saving ||
                      (isCreating
                        ? !canCreate
                        : !canUpdate)
                    }
                    placeholder={
                      t.roleName
                    }
                    autoFocus={
                      isCreating
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="role-description">
                    {
                      t.description
                    }
                  </label>

                  <textarea
                    id="role-description"
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          description:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    maxLength={
                      500
                    }
                    rows={3}
                    disabled={
                      saving ||
                      (isCreating
                        ? !canCreate
                        : !canUpdate)
                    }
                    placeholder={
                      t.description
                    }
                  />
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* Create hint                                                   */}
              {/* ----------------------------------------------------------- */}

              {isCreating && (
                <div className="editor-intro compact">
                  <p>
                    {t.createHint}
                  </p>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* Permissions toolbar                                           */}
              {/* ----------------------------------------------------------- */}

              <div className="permissions-toolbar">
                <div>
                  <span className="panel-eyebrow">
                    {
                      t.permissions
                    }
                  </span>

                  <h3>
                    {
                      form
                        .permission_ids
                        .length
                    }{" "}
                    <small>
                      /{" "}
                      {
                        permissions.length
                      }{" "}
                      {
                        t.selected
                      }
                    </small>
                  </h3>
                </div>

                {canAssign && (
                  <div className="permission-actions">
                    <button
                      type="button"
                      onClick={
                        selectAllPermissions
                      }
                      disabled={
                        saving ||
                        permissions.length ===
                          0
                      }
                    >
                      {
                        t.selectAll
                      }
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearAllPermissions
                      }
                      disabled={
                        saving ||
                        form
                          .permission_ids
                          .length ===
                          0
                      }
                    >
                      {
                        t.clearAll
                      }
                    </button>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------- */}
              {/* Permission search                                             */}
              {/* ----------------------------------------------------------- */}

              <div className="permission-search">
                <span>⌕</span>

                <input
                  type="text"
                  value={
                    permissionSearch
                  }
                  onChange={(
                    event,
                  ) =>
                    setPermissionSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    t.searchPermissions
                  }
                />
              </div>

              {/* ----------------------------------------------------------- */}
              {/* Permissions                                                   */}
              {/* ----------------------------------------------------------- */}

              {permissions.length ===
              0 ? (
                <div className="role-empty large">
                  {
                    t.noPermissions
                  }
                </div>
              ) : permissionGroups.length ===
                0 ? (
                <div className="role-empty large">
                  {
                    t.noMatchingPermissions
                  }
                </div>
              ) : (
                <div className="permission-groups">
                  {permissionGroups.map(
                    (group) => {
                      const groupIds =
                        group.items.map(
                          (item) =>
                            Number(
                              item.id,
                            ),
                        );

                      const selectedCount =
                        groupIds.filter(
                          (id) =>
                            form.permission_ids.includes(
                              id,
                            ),
                        ).length;

                      const allSelected =
                        groupIds.length >
                          0 &&
                        selectedCount ===
                          groupIds.length;

                      const isExpanded =
                        expandedGroups[
                          group.name
                        ] !==
                        false;

                      return (
                        <section
                          key={
                            group.name
                          }
                          className="permission-group"
                        >
                          <div className="permission-group-header">
                            <button
                              type="button"
                              className="group-toggle"
                              onClick={() =>
                                toggleGroup(
                                  group.name,
                                )
                              }
                            >
                              <span className="group-arrow">
                                {isExpanded
                                  ? "▾"
                                  : "▸"}
                              </span>

                              <span>
                                <strong>
                                  {
                                    group.name
                                  }
                                </strong>

                                <small>
                                  {
                                    group
                                      .items
                                      .length
                                  }{" "}
                                  {
                                    t.permissions
                                  }
                                </small>
                              </span>
                            </button>

                            {canAssign && (
                              <button
                                type="button"
                                className={
                                  allSelected
                                    ? "group-action active"
                                    : "group-action"
                                }
                                onClick={() =>
                                  selectGroupPermissions(
                                    group.items,
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                {allSelected
                                  ? t.clearAll
                                  : t.selectAll}
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="permission-grid">
                              {group.items.map(
                                (
                                  permission,
                                ) => {
                                  const id =
                                    Number(
                                      permission.id,
                                    );

                                  const checked =
                                    form.permission_ids.includes(
                                      id,
                                    );

                                  const code =
                                    getPermissionCode(
                                      permission,
                                    );

                                  return (
                                    <label
                                      key={
                                        permission.id
                                      }
                                      className={`permission-item ${
                                        checked
                                          ? "checked"
                                          : ""
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          checked
                                        }
                                        disabled={
                                          saving ||
                                          !canAssign
                                        }
                                        onChange={() =>
                                          togglePermission(
                                            id,
                                          )
                                        }
                                      />

                                      <span className="permission-check">
                                        {checked
                                          ? "✓"
                                          : ""}
                                      </span>

                                      <span className="permission-copy">
                                        <strong>
                                          {
                                            code
                                          }
                                        </strong>

                                        {permission.description && (
                                          <small>
                                            {
                                              permission.description
                                            }
                                          </small>
                                        )}
                                      </span>
                                    </label>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </section>
                      );
                    },
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* Form actions                                                  */}
              {/* ----------------------------------------------------------- */}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    saving
                  }
                >
                  {t.cancel}
                </button>

                {((isCreating &&
                  canCreate) ||
                  (editingRole &&
                    canUpdate)) && (
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      saving ||
                      !form.name.trim()
                    }
                  >
                    {saving
                      ? t.saving
                      : t.save}
                  </button>
                )}
              </div>
            </form>
          )}
        </main>
      </div>
    </section>
  );
}