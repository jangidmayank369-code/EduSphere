import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./components/AppShell";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SchoolProfile from "./pages/SchoolProfile";
import UserManagement from "./pages/UserManagement";
import RoleManagement from "./pages/RoleManagement";
import StudentDashboard from "./pages/StudentDashboard";
import FeeManagement from "./pages/FeeManagement";
import Accounts from "./pages/Accounts";
import SecuritySessions from "./pages/SecuritySessions";

function ShellPage({ children }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/login" element={<Login />} />

      {/* PROTECTED APPLICATION */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <ShellPage>
              <Dashboard />
            </ShellPage>
          }
        />

        <Route
          path="/school-profile"
          element={
            <ShellPage>
              <SchoolProfile />
            </ShellPage>
          }
        />

        <Route
          path="/students"
          element={
            <ShellPage>
              <StudentDashboard />
            </ShellPage>
          }
        />

        {/* Student Fees uses the same Accounts workspace, opened on its fees tab. */}
        <Route
          path="/fees"
          element={<Accounts initialTab="fees" />}
        />

        {/* Accounts page includes its own AppShell. */}
        <Route path="/accounts" element={<Accounts />} />

        <Route element={<ProtectedRoute permission="USER_VIEW" />}>
          <Route
            path="/users"
            element={
              <ShellPage>
                <UserManagement />
              </ShellPage>
            }
          />
        </Route>

        <Route element={<ProtectedRoute permission="RBAC_ROLE_VIEW" />}>
          <Route
            path="/roles"
            element={
              <ShellPage>
                <RoleManagement />
              </ShellPage>
            }
          />
        </Route>

        <Route
          path="/security/sessions"
          element={
            <ShellPage>
              <SecuritySessions />
            </ShellPage>
          }
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
