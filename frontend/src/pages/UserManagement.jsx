import "../users.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

import {
  assignUserRole,
  bulkAssignUserRole,
  bulkDeleteUsers,
  bulkUpdateUserStatus,
  createUser,
  deleteUser,
  getUser,
  getUserPermissions,
  getUserRoles,
  getUsers,
  removeUserRole,
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
    roles: "Roles",
    permissions: "Effective Permissions",
    selectRole: "Select role",
    addRole: "Add Role",
    removeRole: "Remove",
    noRoles: "No active roles available.",
    noPermissions: "No permissions assigned.",

    status: "Status",
    actions: "Actions",
    select: "Select",
    selected: "selected",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    bulkActivate: "Activate selected",
    bulkDeactivate: "Deactivate selected",
    bulkRole: "Assign Role",
    bulkDelete: "Delete selected",
    confirmBulkActivate: "Activate all selected users?",
    confirmBulkDeactivate: "Deactivate all selected users?",
    confirmBulkDelete: "Delete all selected users? This action cannot be undone.",
    bulkStatusChanged: "Selected users status updated.",
    bulkRoleChanged: "Role assigned to selected users.",
    bulkDeleted: "Selected users deleted successfully.",

    edit: "Edit",
    details: "Details",
    activate: "Activate",
    deactivate: "Deactivate",
    reset: "Reset Password",
    delete: "Delete",

    save: "Save User",
    cancel: "Cancel",
    close: "Close",

    createHeading: "Create user",
    editHeading: "Edit user",
    detailsHeading: "User details",
    resetHeading: "Reset password",
    rolesHeading: "Manage roles",

    noUsers: "No users found.",
    loading: "Loading users…",
    loadingRoles: "Loading roles…",
    loadingPermissions: "Loading permissions…",
    saving: "Saving…",
    deleting: "Deleting…",
    loadingDetails: "Loading details…",

    passwordHint: "Minimum 8 characters.",
    created: "User created successfully.",
    updated: "User updated successfully.",
    statusChanged: "User status updated.",
    passwordChanged: "Password reset successfully.",
    deleted: "User deleted successfully.",
    roleAdded: "Role assigned successfully.",
    roleRemoved: "Role removed successfully.",

    confirmDelete:
      "Delete this user? This action cannot be undone.",
    confirmStatus:
      "Change this user's active status?",
    confirmRemoveRole:
      "Remove this role from the user?",

    error:
      "Something went wrong. Please try again.",

    id: "User ID",
    createdAt: "Created",
    updatedAt: "Updated",

    totalRecords: "Total records",
    page: "Page",
    previous: "Previous",
    next: "Next",
    of: "of",

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
    roles: "भूमिकाएँ",
    permissions: "प्रभावी अनुमतियाँ",
    selectRole: "भूमिका चुनें",
    addRole: "भूमिका जोड़ें",
    removeRole: "हटाएँ",
    noRoles: "कोई सक्रिय भूमिका उपलब्ध नहीं है।",
    noPermissions: "कोई अनुमति निर्धारित नहीं है।",

    status: "स्थिति",
    actions: "कार्रवाई",
    select: "चुनें",
    selected: "चयनित",
    selectAll: "सभी चुनें",
    clearSelection: "चयन हटाएँ",
    bulkActivate: "चयनित सक्रिय करें",
    bulkDeactivate: "चयनित निष्क्रिय करें",
    bulkRole: "भूमिका निर्धारित करें",
    bulkDelete: "चयनित डिलीट करें",
    confirmBulkActivate: "क्या सभी चयनित यूज़र्स को सक्रिय करना है?",
    confirmBulkDeactivate: "क्या सभी चयनित यूज़र्स को निष्क्रिय करना है?",
    confirmBulkDelete: "क्या सभी चयनित यूज़र्स को डिलीट करना है? यह कार्रवाई वापस नहीं होगी।",
    bulkStatusChanged: "चयनित यूज़र्स की स्थिति अपडेट हुई।",
    bulkRoleChanged: "चयनित यूज़र्स को भूमिका निर्धारित हुई।",
    bulkDeleted: "चयनित यूज़र्स सफलतापूर्वक डिलीट हुए।",

    edit: "संपादित करें",
    details: "विवरण",
    activate: "सक्रिय करें",
    deactivate: "निष्क्रिय करें",
    reset: "पासवर्ड रीसेट",
    delete: "डिलीट",

    save: "यूज़र सेव करें",
    cancel: "रद्द करें",
    close: "बंद करें",

    createHeading: "यूज़र बनाएँ",
    editHeading: "यूज़र संपादित करें",
    detailsHeading: "यूज़र विवरण",
    resetHeading: "पासवर्ड रीसेट",
    rolesHeading: "भूमिकाएँ प्रबंधित करें",

    noUsers: "कोई यूज़र नहीं मिला।",
    loading: "यूज़र लोड हो रहे हैं…",
    loadingRoles: "भूमिकाएँ लोड हो रही हैं…",
    loadingPermissions: "अनुमतियाँ लोड हो रही हैं…",
    saving: "सेव हो रहा है…",
    deleting: "डिलीट हो रहा है…",
    loadingDetails: "विवरण लोड हो रहा है…",

    passwordHint: "कम से कम 8 अक्षर।",
    created: "यूज़र सफलतापूर्वक बनाया गया।",
    updated: "यूज़र सफलतापूर्वक अपडेट हुआ।",
    statusChanged: "यूज़र की स्थिति अपडेट हुई।",
    passwordChanged: "पासवर्ड सफलतापूर्वक रीसेट हुआ।",
    deleted: "यूज़र सफलतापूर्वक डिलीट हुआ।",
    roleAdded: "भूमिका सफलतापूर्वक जोड़ी गई।",
    roleRemoved: "भूमिका सफलतापूर्वक हटाई गई।",

    confirmDelete:
      "क्या इस यूज़र को डिलीट करना है? यह कार्रवाई वापस नहीं होगी।",
    confirmStatus:
      "क्या यूज़र की सक्रिय स्थिति बदलनी है?",
    confirmRemoveRole:
      "क्या इस यूज़र से यह भूमिका हटानी है?",

    error:
      "कुछ गलत हुआ। कृपया फिर प्रयास करें।",

    id: "यूज़र ID",
    createdAt: "बनाया गया",
    updatedAt: "अपडेट किया गया",

    totalRecords: "कुल रिकॉर्ड",
    page: "पेज",
    previous: "पिछला",
    next: "अगला",
    of: "में से",

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
  if (!value) {
    return "—";
  }

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
  const { hasPermission } = useAuth();

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

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [permissionsLoading, setPermissionsLoading] =
    useState(false);

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

  const [roleToAdd, setRoleToAdd] = useState("");

  const [userPermissions, setUserPermissions] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRoleId, setBulkRoleId] = useState("");

  useEffect(() => {
    const onLanguageChange = (event) => {
      setLanguage(
        event.detail === "HI"
          ? "HI"
          : "EN",
      );
    };

    window.addEventListener(
      "edusphere-language-change",
      onLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "edusphere-language-change",
        onLanguageChange,
      );
    };
  }, []);


  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  const canCreate = hasPermission("USER_CREATE");
  const canView = hasPermission("USER_VIEW");
  const canUpdate = hasPermission("USER_UPDATE");
  const canStatus = hasPermission("USER_STATUS_UPDATE");
  const canResetPassword = hasPermission(
    "USER_PASSWORD_RESET",
  );
  const canDelete = hasPermission("USER_DELETE");
  // Keep role-management UI permission aligned with the RBAC role-assignment API.
  const canAssignRole = hasPermission(
    "RBAC_ROLE_ASSIGN",
  );

  const canBulkStatus = canStatus;
  const canBulkRole = canAssignRole;
  const canBulkDelete = canDelete;


  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  const loadRoles = useCallback(async () => {
    if (!canView) {
      return;
    }

    setRolesLoading(true);

    try {
      const result = unwrap(
        await getUserRoles(),
      );

      const rows = Array.isArray(result)
        ? result
        : result?.items ||
          result?.results ||
          [];

      setRoles(
        rows.filter(
          (role) =>
            role?.is_active !== false,
        ),
      );
    } catch (err) {
      setRoles([]);
      setError(
        getError(err, t.error),
      );
    } finally {
      setRolesLoading(false);
    }
  }, [canView, t.error]);


  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  const loadUsers = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getUsers({
        page,
        page_size: pageSize,
        search:
          search.trim() ||
          undefined,
        status_filter:
          statusFilter ||
          undefined,
      });

      const payload =
        response?.data ?? response;

      const rows = Array.isArray(payload)
        ? payload
        : payload?.items ||
          payload?.results ||
          [];

      const meta =
        response?.meta ||
        payload?.meta ||
        {};

      setUsers(rows);
      setSelectedIds((current) =>
        current.filter((id) =>
          rows.some((user) => user.id === id),
        ),
      );
      setTotal(
        Number(meta.total) || 0,
      );
      setTotalPages(
        Number(meta.total_pages) ||
        (
          Number(meta.total) > 0
            ? Math.ceil(
                Number(meta.total) /
                  pageSize,
              )
            : 0
        ),
      );
    } catch (err) {
      setUsers([]);
      setTotal(0);
      setTotalPages(0);

      setError(
        getError(err, t.error),
      );
    } finally {
      setLoading(false);
    }
  }, [
    canView,
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

    return () =>
      clearTimeout(timer);
  }, [loadUsers]);


  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const stats = useMemo(() => {
    return {
      total,
      active: users.filter(
        (user) =>
          user.is_active,
      ).length,
      inactive: users.filter(
        (user) =>
          !user.is_active,
      ).length,
    };
  }, [users, total]);


  // -------------------------------------------------------------------------
  // Modal helpers
  // -------------------------------------------------------------------------

  function clearMessages() {
    setError("");
    setNotice("");
  }


  function openCreate() {
    setForm({
      full_name: "",
      email: "",
      password: "",
      role_id: "",
    });

    setSelected(null);
    setModal("create");
    clearMessages();

    loadRoles();
  }


  function openEdit(user) {
    setForm({
      full_name:
        user.full_name || "",
      email:
        user.email || "",
      password: "",
      role_id:
        user.role_id || "",
    });

    setSelected(user);
    setModal("edit");
    clearMessages();

    loadRoles();
  }


  async function openDetails(user) {
    clearMessages();

    setPermissionsLoading(true);

    try {
      const [userResult, permissionResult] =
        await Promise.all([
          getUser(user.id),
          getUserPermissions(user.id),
        ]);

      const detailUser =
        unwrap(userResult);

      const permissionData =
        unwrap(permissionResult);

      setSelected(detailUser);

      setUserPermissions(
        Array.isArray(
          permissionData?.permissions,
        )
          ? permissionData.permissions
          : [],
      );

      setModal("details");
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setPermissionsLoading(false);
    }
  }


  function openRoles(user) {
    setSelected(user);
    setRoleToAdd("");
    setModal("roles");
    clearMessages();
    loadRoles();
  }


  function openPassword(user) {
    setSelected(user);
    setPassword("");
    setModal("password");
    clearMessages();
  }


  // -------------------------------------------------------------------------
  // Create / Update
  // -------------------------------------------------------------------------

  async function handleSave(event) {
    event.preventDefault();

    if (
      !canCreate &&
      modal === "create"
    ) {
      return;
    }

    if (
      !canUpdate &&
      modal === "edit"
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      if (modal === "create") {
        await createUser({
          full_name:
            form.full_name.trim(),
          email:
            form.email.trim(),
          password:
            form.password,
          role_id:
            Number(form.role_id),
        });

        setNotice(t.created);
      } else {
        await updateUser(
          selected.id,
          {
            full_name:
              form.full_name.trim(),
            email:
              form.email.trim(),
            role_id:
              form.role_id
                ? Number(form.role_id)
                : undefined,
          },
        );

        setNotice(t.updated);
      }

      setModal(null);

      await loadUsers();
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async function handleStatus(user) {
    if (!canStatus) {
      return;
    }

    if (
      !window.confirm(
        t.confirmStatus,
      )
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await updateUserStatus(
        user.id,
        !user.is_active,
      );

      setNotice(
        t.statusChanged,
      );

      await loadUsers();
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(user) {
    if (!canDelete) {
      return;
    }

    if (
      !window.confirm(
        t.confirmDelete,
      )
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await deleteUser(user.id);

      setNotice(t.deleted);

      if (
        selected?.id === user.id
      ) {
        setSelected(null);
        setModal(null);
      }

      await loadUsers();
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  // -------------------------------------------------------------------------
  // Password
  // -------------------------------------------------------------------------

  async function handlePassword(event) {
    event.preventDefault();

    if (!canResetPassword) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await resetUserPassword(
        selected.id,
        password,
      );

      setPassword("");
      setModal(null);

      setNotice(
        t.passwordChanged,
      );
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  async function handleAddRole() {
    if (
      !canAssignRole ||
      !roleToAdd ||
      !selected
    ) {
      return;
    }

    const roleId =
      Number(roleToAdd);

    const alreadyAssigned =
      (selected.roles || [])
        .some(
          (roleName) =>
            roles.some(
              (role) =>
                role.id === roleId &&
                role.name === roleName,
            ),
        );

    if (alreadyAssigned) {
      setError(
        language === "HI"
          ? "यह भूमिका पहले से निर्धारित है।"
          : "This role is already assigned.",
      );

      return;
    }

    setWorking(true);
    clearMessages();

    try {
      const result =
        await assignUserRole(
          selected.id,
          roleId,
        );

      const updated =
        unwrap(result);

      setSelected(
        (current) => ({
          ...current,
          roles:
            updated?.role_ids
              ? roles
                  .filter(
                    (role) =>
                      updated.role_ids.includes(
                        role.id,
                      ),
                  )
                  .map(
                    (role) =>
                      role.name,
                  )
              : current?.roles || [],
        }),
      );

      setRoleToAdd("");

      setNotice(t.roleAdded);

      await loadUsers();

      const fresh =
        unwrap(
          await getUser(
            selected.id,
          ),
        );

      setSelected(fresh);
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  async function handleRemoveRole(
    roleName,
  ) {
    if (
      !canAssignRole ||
      !selected
    ) {
      return;
    }

    const role =
      roles.find(
        (item) =>
          item.name === roleName,
      );

    if (!role) {
      setError(
        language === "HI"
          ? "भूमिका नहीं मिली।"
          : "Role could not be found.",
      );

      return;
    }

    if (
      !window.confirm(
        t.confirmRemoveRole,
      )
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await removeUserRole(
        selected.id,
        role.id,
      );

      setNotice(
        t.roleRemoved,
      );

      const fresh =
        unwrap(
          await getUser(
            selected.id,
          ),
        );

      setSelected(fresh);

      await loadUsers();
    } catch (err) {
      setError(
        getError(err, t.error),
      );
    } finally {
      setWorking(false);
    }
  }


  // -------------------------------------------------------------------------
  // Bulk selection
  // -------------------------------------------------------------------------

  const visibleUserIds = useMemo(
    () => users.map((user) => user.id),
    [users],
  );

  const selectedVisibleIds = useMemo(
    () =>
      visibleUserIds.filter((id) =>
        selectedIds.includes(id),
      ),
    [visibleUserIds, selectedIds],
  );

  const allVisibleSelected =
    visibleUserIds.length > 0 &&
    selectedVisibleIds.length === visibleUserIds.length;

  function toggleUserSelection(userId) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !visibleUserIds.includes(id),
        ),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...visibleUserIds,
      ]),
    ]);
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function handleBulkStatus(isActive) {
    if (!canBulkStatus || !selectedIds.length) {
      return;
    }

    if (
      !window.confirm(
        isActive
          ? t.confirmBulkActivate
          : t.confirmBulkDeactivate,
      )
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await bulkUpdateUserStatus(
        selectedIds,
        isActive,
      );

      setNotice(t.bulkStatusChanged);
      clearSelection();
      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  async function handleBulkRole() {
    if (
      !canBulkRole ||
      !selectedIds.length ||
      !bulkRoleId
    ) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await bulkAssignUserRole(
        selectedIds,
        Number(bulkRoleId),
      );

      setNotice(t.bulkRoleChanged);
      setBulkRoleId("");
      clearSelection();
      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  async function handleBulkDelete() {
    if (!canBulkDelete || !selectedIds.length) {
      return;
    }

    if (!window.confirm(t.confirmBulkDelete)) {
      return;
    }

    setWorking(true);
    clearMessages();

    try {
      await bulkDeleteUsers(selectedIds);

      setNotice(t.bulkDeleted);
      clearSelection();
      await loadUsers();
    } catch (err) {
      setError(getError(err, t.error));
    } finally {
      setWorking(false);
    }
  }

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  function goPrevious() {
    if (page <= 1) {
      return;
    }

    clearSelection();

    setPage(
      (current) =>
        current - 1,
    );
  }


  function goNext() {
    if (
      totalPages &&
      page >= totalPages
    ) {
      return;
    }

    clearSelection();

    setPage(
      (current) =>
        current + 1,
    );
  }


  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <section className="users-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            {t.identity}
          </div>

          <h1>
            {t.title}
          </h1>

          <p>
            {t.subtitle}
          </p>
        </div>

        {canCreate && (
          <button
            className="primary-button"
            onClick={openCreate}
            disabled={working}
          >
            + {t.add}
          </button>
        )}
      </div>


      <div className="users-stat-grid">
        <Stat
          label={t.totalRecords}
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
              setSearch(
                event.target.value,
              );
            }}
            placeholder={
              t.search
            }
          />
        </div>


        <div className="filter-group">
          {[
            ["", t.all],
            ["active", t.active],
            ["inactive", t.inactive],
          ].map(
            ([value, label]) => (
              <button
                key={
                  value || "all"
                }
                className={
                  statusFilter ===
                  value
                    ? "filter-active"
                    : ""
                }
                onClick={() => {
                  setPage(1);
                  setStatusFilter(
                    value,
                  );
                }}
              >
                {label}
              </button>
            ),
          )}
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
            <h2>
              {t.users}
            </h2>

            <span>
              {users.length} /{" "}
              {total}{" "}
              {t.totalRecords}
            </span>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="users-toolbar users-bulk-toolbar">
            <strong>
              {selectedIds.length} {t.selected}
            </strong>

            <button
              className="secondary-button"
              onClick={clearSelection}
              disabled={working}
            >
              {t.clearSelection}
            </button>

            {canBulkStatus && (
              <>
                <button
                  className="secondary-button"
                  onClick={() => handleBulkStatus(true)}
                  disabled={working}
                >
                  {t.bulkActivate}
                </button>

                <button
                  className="secondary-button"
                  onClick={() => handleBulkStatus(false)}
                  disabled={working}
                >
                  {t.bulkDeactivate}
                </button>
              </>
            )}

            {canBulkRole && (
              <>
                <select
                  value={bulkRoleId}
                  onChange={(event) =>
                    setBulkRoleId(event.target.value)
                  }
                  disabled={rolesLoading || working}
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

                <button
                  className="primary-button"
                  onClick={handleBulkRole}
                  disabled={working || !bulkRoleId}
                >
                  {t.bulkRole}
                </button>
              </>
            )}

            {canBulkDelete && (
              <button
                className="danger-text"
                onClick={handleBulkDelete}
                disabled={working}
              >
                {t.bulkDelete}
              </button>
            )}
          </div>
        )}

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
                  <th className="users-select-cell">
                    <input
                      type="checkbox"
                      aria-label={t.selectAll}
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      disabled={working}
                    />
                  </th>

                  <th>
                    {t.name}
                  </th>

                  <th>
                    {t.email}
                  </th>

                  <th>
                    {t.roles}
                  </th>

                  <th>
                    {t.status}
                  </th>

                  <th>
                    {t.actions}
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className={
                        selectedIds.includes(user.id)
                          ? "user-row-selected"
                          : ""
                      }
                    >
                      <td className="users-select-cell">
                        <input
                          type="checkbox"
                          aria-label={`${t.select} ${user.full_name}`}
                          checked={selectedIds.includes(user.id)}
                          onChange={() =>
                            toggleUserSelection(user.id)
                          }
                          disabled={working}
                        />
                      </td>

                      <td>
                        <button
                          className="user-name-button"
                          onClick={() =>
                            openDetails(
                              user,
                            )
                          }
                        >
                          <span className="user-avatar">
                            {(
                              user.full_name ||
                              "?"
                            )
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </span>

                          <span>
                            <strong>
                              {
                                user.full_name
                              }
                            </strong>

                            <small>
                              {t.id} #
                              {
                                user.id
                              }
                            </small>
                          </span>
                        </button>
                      </td>


                      <td>
                        {user.email}
                      </td>


                      <td>
                        <div className="role-list">
                          {(
                            user.roles ||
                            []
                          ).length ? (
                            user.roles.map(
                              (
                                role,
                              ) => (
                                <span
                                  className="role-chip"
                                  key={
                                    role
                                  }
                                >
                                  {
                                    role
                                  }
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
                          {canView && (
                            <button
                              onClick={() =>
                                openDetails(
                                  user,
                                )
                              }
                            >
                              {
                                t.details
                              }
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              onClick={() =>
                                openEdit(
                                  user,
                                )
                              }
                            >
                              {t.edit}
                            </button>
                          )}

                          {canAssignRole && (
                            <button
                              onClick={() =>
                                openRoles(
                                  user,
                                )
                              }
                            >
                              {t.roles}
                            </button>
                          )}

                          {canStatus && (
                            <button
                              onClick={() =>
                                handleStatus(
                                  user,
                                )
                              }
                              disabled={
                                working
                              }
                            >
                              {user.is_active
                                ? t.deactivate
                                : t.activate}
                            </button>
                          )}

                          {canResetPassword && (
                            <button
                              onClick={() =>
                                openPassword(
                                  user,
                                )
                              }
                            >
                              {
                                t.reset
                              }
                            </button>
                          )}

                          {canDelete && (
                            <button
                              className="danger-text"
                              onClick={() =>
                                handleDelete(
                                  user,
                                )
                              }
                              disabled={
                                working
                              }
                            >
                              {
                                t.delete
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}


        {totalPages > 1 && (
          <div className="users-pagination">
            <button
              className="secondary-button"
              onClick={
                goPrevious
              }
              disabled={
                page <= 1 ||
                loading
              }
            >
              ← {t.previous}
            </button>

            <span>
              {t.page}{" "}
              {page} {t.of}{" "}
              {totalPages}
            </span>

            <button
              className="secondary-button"
              onClick={
                goNext
              }
              disabled={
                loading ||
                page >=
                  totalPages
              }
            >
              {t.next} →
            </button>
          </div>
        )}
      </div>


      {/* ------------------------------------------------------------------ */}
      {/* Modal                                                              */}
      {/* ------------------------------------------------------------------ */}

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !working &&
            setModal(null)
          }
        >
          <div
            className="users-modal"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  {t.identity}
                </span>

                <h2>
                  {modal ===
                  "create"
                    ? t.createHeading
                    : modal ===
                        "edit"
                      ? t.editHeading
                      : modal ===
                          "password"
                        ? t.resetHeading
                        : modal ===
                            "roles"
                          ? t.rolesHeading
                          : t.detailsHeading}
                </h2>
              </div>

              <button
                onClick={() =>
                  !working &&
                  setModal(null)
                }
              >
                ×
              </button>
            </div>


            {/* Details */}
            {modal ===
            "details" ? (
              <div className="user-details">
                {permissionsLoading ? (
                  <div className="users-empty">
                    {
                      t.loadingDetails
                    }
                  </div>
                ) : (
                  <>
                    <Detail
                      label={t.id}
                      value={`#${selected?.id}`}
                    />

                    <Detail
                      label={t.name}
                      value={
                        selected?.full_name
                      }
                    />

                    <Detail
                      label={t.email}
                      value={
                        selected?.email
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
                      label={t.roles}
                      value={
                        selected?.roles
                          ?.length
                          ? selected.roles.join(
                              ", ",
                            )
                          : "—"
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

                    <div className="detail-section">
                      <h3>
                        {
                          t.permissions
                        }
                      </h3>

                      {userPermissions.length ? (
                        <div className="permission-list">
                          {userPermissions
                            .slice()
                            .sort()
                            .map(
                              (
                                permission,
                              ) => (
                                <span
                                  className="permission-chip"
                                  key={
                                    permission
                                  }
                                >
                                  {
                                    permission
                                  }
                                </span>
                              ),
                            )}
                        </div>
                      ) : (
                        <div className="form-hint">
                          {
                            t.noPermissions
                          }
                        </div>
                      )}
                    </div>

                    <button
                      className="secondary-button full-width"
                      onClick={() =>
                        setModal(
                          null,
                        )
                      }
                    >
                      {t.close}
                    </button>
                  </>
                )}
              </div>
            ) : null}


            {/* Password */}
            {modal ===
              "password" && (
              <form
                onSubmit={
                  handlePassword
                }
                className="user-form"
              >
                <label>
                  {t.password}

                  <input
                    type="password"
                    minLength={8}
                    maxLength={128}
                    value={
                      password
                    }
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      t.passwordHint
                    }
                    required
                  />
                </label>

                <div className="form-hint">
                  {
                    t.passwordHint
                  }
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setModal(
                        null,
                      )
                    }
                    disabled={
                      working
                    }
                  >
                    {t.cancel}
                  </button>

                  <button
                    className="primary-button"
                    disabled={
                      working ||
                      password.length <
                        8
                    }
                  >
                    {working
                      ? t.saving
                      : t.reset}
                  </button>
                </div>
              </form>
            )}


            {/* Roles */}
            {modal ===
              "roles" && (
              <div className="user-form">
                <div className="detail-section">
                  <h3>
                    {t.roles}
                  </h3>

                  <div className="role-list">
                    {(
                      selected?.roles ||
                      []
                    ).length ? (
                      selected.roles.map(
                        (
                          roleName,
                        ) => (
                          <span
                            className="role-chip"
                            key={
                              roleName
                            }
                          >
                            {roleName}

                            {canAssignRole && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveRole(
                                    roleName,
                                  )
                                }
                                disabled={
                                  working
                                }
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ),
                      )
                    ) : (
                      "—"
                    )}
                  </div>
                </div>


                {canAssignRole && (
                  <>
                    <label>
                      {t.addRole}

                      <select
                        value={
                          roleToAdd
                        }
                        onChange={(
                          event,
                        ) =>
                          setRoleToAdd(
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          rolesLoading ||
                          working
                        }
                      >
                        <option value="">
                          {rolesLoading
                            ? t.loadingRoles
                            : t.selectRole}
                        </option>

                        {roles.map(
                          (role) => (
                            <option
                              key={
                                role.id
                              }
                              value={
                                role.id
                              }
                              disabled={(
                                selected?.roles ||
                                []
                              ).includes(
                                role.name,
                              )}
                            >
                              {
                                role.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        handleAddRole
                      }
                      disabled={
                        working ||
                        !roleToAdd
                      }
                    >
                      +
                      {" "}
                      {t.addRole}
                    </button>
                  </>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setModal(
                        null,
                      )
                    }
                    disabled={
                      working
                    }
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            )}


            {/* Create / Edit */}
            {(modal ===
              "create" ||
              modal ===
                "edit") && (
              <form
                onSubmit={
                  handleSave
                }
                className="user-form"
              >
                <label>
                  {t.name}

                  <input
                    value={
                      form.full_name
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          full_name:
                            event.target
                              .value,
                        }),
                      )
                    }
                    maxLength={200}
                    required
                  />
                </label>


                <label>
                  {t.email}

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          email:
                            event.target
                              .value,
                        }),
                      )
                    }
                    maxLength={255}
                    required
                  />
                </label>


                <label>
                  {t.role}

                  <select
                    value={
                      form.role_id
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          role_id:
                            event.target
                              .value,
                        }),
                      )
                    }
                    required={
                      modal ===
                      "create"
                    }
                    disabled={
                      rolesLoading ||
                      working
                    }
                  >
                    <option value="">
                      {rolesLoading
                        ? t.loadingRoles
                        : t.selectRole}
                    </option>

                    {roles.map(
                      (role) => (
                        <option
                          key={
                            role.id
                          }
                          value={
                            role.id
                          }
                        >
                          {
                            role.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>


                {modal ===
                  "create" && (
                  <label>
                    {t.password}

                    <input
                      type="password"
                      minLength={8}
                      maxLength={128}
                      value={
                        form.password
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            password:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder={
                        t.passwordHint
                      }
                      required
                    />
                  </label>
                )}


                {modal ===
                  "create" && (
                  <div className="form-hint">
                    {
                      t.passwordHint
                    }
                  </div>
                )}


                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setModal(
                        null,
                      )
                    }
                    disabled={
                      working
                    }
                  >
                    {t.cancel}
                  </button>

                  <button
                    className="primary-button"
                    disabled={
                      working ||
                      (modal ===
                        "create" &&
                        !form.role_id) ||
                      (modal ===
                        "create" &&
                        form.password.length <
                          8)
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


// -----------------------------------------------------------------------------
// Small components
// -----------------------------------------------------------------------------

function Stat({
  label,
  value,
}) {
  return (
    <div className="users-stat">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}


function Detail({
  label,
  value,
}) {
  return (
    <div className="detail-row">
      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}