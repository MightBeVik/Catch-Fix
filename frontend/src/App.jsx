import AppShell from "./layout/AppShell";
import DashboardPage from "./modules/monitoring/pages/DashboardPage";
import GovernancePage from "./modules/governance/pages/GovernancePage";
import IncidentsPage from "./modules/incidents/pages/IncidentsPage";
import MaintenancePage from "./modules/incidents/pages/MaintenancePage";
import RegistryPage from "./modules/registry/pages/RegistryPage";
import ServiceDetailPage from "./modules/registry/pages/ServiceDetailPage";

const pageMap = {
  "/": DashboardPage,
  "/registry": RegistryPage,
  "/service-detail": ServiceDetailPage,
  "/incidents": IncidentsPage,
  "/maintenance": MaintenancePage,
  "/governance": GovernancePage,
};

export default function App() {
  const pathname = window.location.pathname;
  const ActivePage = pageMap[pathname] ?? DashboardPage;

  return <AppShell activePath={pathname} content={<ActivePage />} />;
}