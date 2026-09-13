import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./components/AppShell";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SchoolProfile from "./pages/SchoolProfile";
import UserManagement from "./pages/UserManagement";
import StudentDashboard from "./pages/StudentDashboard";
import FeeManagement from "./pages/FeeManagement";

function ShellPage({ children }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected Application */}
      <Route element={<ProtectedRoute />}>
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* School Core */}
        <Route
          path="/school-profile"
          element={
            <ShellPage>
              <SchoolProfile />
            </ShellPage>
          }
        />

        {/* Student 360 / Student Dashboard */}
        <Route
          path="/students"
          element={
            <ShellPage>
              <StudentDashboard />
            </ShellPage>
          }
        />

        {/* Complete Fee Management */}
        <Route
          path="/fees"
          element={
            <ShellPage>
              <FeeManagement />
            </ShellPage>
          }
        />

        {/* Users & Identity */}
        <Route
          path="/users"
          element={
            <ShellPage>
              <UserManagement />
            </ShellPage>
          }
        />
      </Route>

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}