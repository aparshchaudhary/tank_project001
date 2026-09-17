import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { Header } from './components/common/Header';
import { Sidebar, NavigationTab } from './components/common/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { SubsystemsPage } from './pages/SubsystemsPage';
import { SubsystemDetailPage } from './pages/SubsystemDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { ReportsPage } from './pages/ReportsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ModelsRegistryPage } from './pages/ModelsRegistryPage';
import { AdminPage } from './pages/AdminPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { MaintenanceModal } from './components/common/Modals';
import { api } from './services/api';
import { Subsystem } from './types';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [drillDownSubsystemId, setDrillDownSubsystemId] = useState<string | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceSubsystemId, setMaintenanceSubsystemId] = useState<string | undefined>();

  const fetchGlobalCounts = async () => {
    try {
      const [alerts, subs] = await Promise.all([
        api.getAlerts({ status: 'ACTIVE' }),
        api.getSubsystems(),
      ]);
      setActiveAlertsCount(alerts.length);
      setSubsystems(subs);
    } catch (e) {
      // Ignore initial network errors
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGlobalCounts();
      const interval = setInterval(fetchGlobalCounts, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-defense-950 flex items-center justify-center font-mono text-cyan-400">
        LOADING TURRET CBPM SYSTEM CONSOLE...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleDrillDown = (subsystemId: string) => {
    setDrillDownSubsystemId(subsystemId);
    setCurrentTab('subsystems');
  };

  const handleBackToSubsystems = () => {
    setDrillDownSubsystemId(null);
  };

  const handleOpenMaintenanceModal = (subId?: string) => {
    setMaintenanceSubsystemId(subId);
    setIsMaintenanceModalOpen(true);
  };

  const handleCreateMaintenance = async (data: any) => {
    await api.createMaintenanceEvent(data);
    await fetchGlobalCounts();
  };

  return (
    <div className="min-h-screen bg-defense-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeAlertCount={activeAlertsCount}
        onOpenAlerts={() => {
          setDrillDownSubsystemId(null);
          setCurrentTab('alerts');
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setDrillDownSubsystemId(null);
            setCurrentTab(tab);
          }}
          activeAlertsCount={activeAlertsCount}
        />

        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {currentTab === 'overview' && (
            <OverviewPage
              onDrillDown={handleDrillDown}
              onNavigateAlerts={() => setCurrentTab('alerts')}
            />
          )}

          {currentTab === 'live' && <LiveMonitoringPage />}

          {currentTab === 'subsystems' && (
            drillDownSubsystemId ? (
              <SubsystemDetailPage
                subsystemId={drillDownSubsystemId}
                onBack={handleBackToSubsystems}
                onOpenMaintenanceModal={handleOpenMaintenanceModal}
              />
            ) : (
              <SubsystemsPage onDrillDown={handleDrillDown} />
            )
          )}

          {currentTab === 'alerts' && <AlertsPage />}

          {currentTab === 'analytics' && <AnalyticsPage />}

          {currentTab === 'maintenance' && <MaintenancePage />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'simulator' && <SimulatorPage />}

          {currentTab === 'models' && <ModelsRegistryPage />}

          {currentTab === 'admin' && <AdminPage />}

          {currentTab === 'audit' && <AuditLogsPage />}
        </main>
      </div>

      {/* Global Maintenance Modal */}
      {isMaintenanceModalOpen && (
        <MaintenanceModal
          subsystems={subsystems}
          defaultSubsystemId={maintenanceSubsystemId}
          onClose={() => setIsMaintenanceModalOpen(false)}
          onConfirm={handleCreateMaintenance}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <MainLayout />
      </TelemetryProvider>
    </AuthProvider>
  );
}

export default App;
