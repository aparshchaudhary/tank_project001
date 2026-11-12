import React, { createContext, useContext, useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import { SimulatorStatus, Subsystem } from '../types';

export interface TelemetryItem {
  subsystem_id: string;
  subsystem_code: string;
  subsystem_name: string;
  health_index: number;
  status_band: string;
  features: Record<string, number>;
  timestamp: string;
}

interface TelemetryContextType {
  isConnected: boolean;
  hasLiveData: boolean;
  readingsCount: number;
  lastReceivedAt: string | null;
  latestBatch: TelemetryItem[];
  simulatorStatus: SimulatorStatus | null;
  refreshSimulatorStatus: () => Promise<void>;
  refreshLatestTelemetry: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasLiveData, setHasLiveData] = useState<boolean>(false);
  const [readingsCount, setReadingsCount] = useState<number>(0);
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);
  const [latestBatch, setLatestBatch] = useState<TelemetryItem[]>([]);
  const [simulatorStatus, setSimulatorStatus] = useState<SimulatorStatus | null>(null);

  const refreshSimulatorStatus = async () => {
    try {
      const status = await api.getSimulatorStatus();
      setSimulatorStatus(status);
    } catch (e) {
      console.error('Failed to fetch simulator status', e);
    }
  };

  const refreshLatestTelemetry = async () => {
    try {
      const overview = await api.getOverview();
      if (overview?.subsystems && overview.subsystems.length > 0) {
        const serverHasLive = Boolean((overview as any).has_live_data);
        const anySubHasFeatures = overview.subsystems.some(
          (s) => s.latest_features && Object.keys(s.latest_features).length > 0
        );
        if (serverHasLive || anySubHasFeatures) {
          setHasLiveData(true);
          if ((overview as any).readings_count) {
            setReadingsCount((overview as any).readings_count);
          }
          setLatestBatch((prev) => {
            const map = new Map<string, TelemetryItem>();
            prev.forEach((item) => map.set(item.subsystem_code, item));
            overview.subsystems.forEach((s) => {
              const existing = map.get(s.code);
              map.set(s.code, {
                subsystem_id: s.id,
                subsystem_code: s.code,
                subsystem_name: s.name,
                health_index: s.current_health_index,
                status_band: s.status_band || 'HEALTHY',
                features: { ...(existing?.features || {}), ...(s.latest_features || {}) },
                timestamp: new Date().toISOString(),
              });
            });
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    wsService.connect();
    refreshLatestTelemetry();

    const unsubscribe = wsService.subscribe((data) => {
      if (data.type === 'WS_CONNECTED') {
        setIsConnected(true);
      } else if (data.type === 'WS_DISCONNECTED' || data.type === 'WS_ERROR') {
        setIsConnected(false);
      } else if (data.type === 'HANDSHAKE') {
        setIsConnected(true);
        if (data.has_live_data && data.batch && data.batch.length > 0) {
          setHasLiveData(true);
          if (data.readings_count) setReadingsCount(data.readings_count);
          setLatestBatch(data.batch);
        } else {
          setHasLiveData(false);
          setLatestBatch([]);
        }
        if (data.simulator_status) {
          setSimulatorStatus(data.simulator_status);
        }
      } else if (data.type === 'TELEMETRY_UPDATE') {
        setHasLiveData(true);
        if (data.readings_count) setReadingsCount(data.readings_count);
        if (data.last_received_at) setLastReceivedAt(data.last_received_at);
        if (data.batch && Array.isArray(data.batch)) {
          setLatestBatch((prev) => {
            const map = new Map<string, TelemetryItem>();
            prev.forEach((item) => map.set(item.subsystem_code, item));
            data.batch.forEach((newItem: TelemetryItem) => {
              const existing = map.get(newItem.subsystem_code);
              map.set(newItem.subsystem_code, {
                ...newItem,
                features: { ...(existing?.features || {}), ...(newItem.features || {}) },
              });
            });
            return Array.from(map.values());
          });
        }
        if (data.simulator_status) {
          setSimulatorStatus(data.simulator_status);
        }
      }
    });

    // Fallback polling every 3 seconds to keep telemetry in sync with the REST API
    const interval = setInterval(() => {
      refreshSimulatorStatus();
      refreshLatestTelemetry();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        isConnected,
        hasLiveData,
        readingsCount,
        lastReceivedAt,
        latestBatch,
        simulatorStatus,
        refreshSimulatorStatus,
        refreshLatestTelemetry,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = (): TelemetryContextType => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};
