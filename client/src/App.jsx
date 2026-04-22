import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "./lib/roles";
import { applyTheme, DEFAULT_THEME, getStoredTheme, setStoredTheme } from "./lib/theme";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ForgotUsernamePage } from "./pages/ForgotUsernamePage";
import { GovernancePage } from "./pages/GovernancePage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { LoginPage } from "./pages/LoginPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { RegistryPage } from "./pages/RegistryPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SecurityPage } from "./pages/SecurityPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [theme, setTheme] = useState(() => getStoredTheme() || DEFAULT_THEME);

  useEffect(() => {
    applyTheme(setStoredTheme(theme));
  }, [theme]);

  function handleLogin(data) {
    setStoredAuth(data);
    setAuth(data);
  }

  function handleLogout() {
    clearStoredAuth();
    setAuth(null);
  }

  function handleUserUpdate(user) {
    setAuth((current) => {
      if (!current) return current;
      const next = { ...current, user };
      setStoredAuth(next);
      return next;
    });
  }

  const user = auth?.user ?? null;
  const role = user?.role ?? null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth
            ? <Navigate to="/dashboard" replace />
            : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/forgot-username" element={<ForgotUsernamePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          auth
            ? <AppLayout role={role} user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} theme={theme} setTheme={setTheme} />
            : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/registry/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/governance" element={<GovernancePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Route>

      <Route path="*" element={<Navigate to={auth ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
