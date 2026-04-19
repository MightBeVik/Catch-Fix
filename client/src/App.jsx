import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { DEFAULT_ROLE, getStoredRole, setStoredRole } from "./lib/roles";
import { applyTheme, DEFAULT_THEME, getStoredTheme, setStoredTheme } from "./lib/theme";
import { GovernancePage } from "./pages/GovernancePage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { RegistryPage } from "./pages/RegistryPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";

export default function App() {
  const [role, setRole] = useState(() => getStoredRole() || DEFAULT_ROLE);
  const [theme, setTheme] = useState(() => getStoredTheme() || DEFAULT_THEME);

  useEffect(() => {
    setStoredRole(role);
  }, [role]);

  useEffect(() => {
    applyTheme(setStoredTheme(theme));
  }, [theme]);

  return (
    <Routes>
      <Route element={<AppLayout role={role} setRole={setRole} theme={theme} setTheme={setTheme} />}>
        <Route index element={<Navigate to="/registry" replace />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/registry/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/governance" element={<GovernancePage />} />
      </Route>
    </Routes>
  );
}