import React, { createContext, useContext, useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import { SimulatorStatus, Subsystem } from '../types';

interface TelemetryItem {
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
  latestBatch: TelemetryItem[];
  simulatorStatus: SimulatorStatus | null;
  refreshSimulatorStatus: () => Promise<void>;
  triggerDemoMode: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
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

  const triggerDemoMode = async () => {
    try {
      const status = await api.triggerDemoMode();
      setSimulatorStatus(status);
    } catch (e) {
      console.error('Failed to launch demo mode', e);
    }
  };

  useEffect(() => {
    wsService.connect();
    refreshSimulatorStatus();

    const unsubscribe = wsService.subscribe((data) => {
      if (data.type === 'WS_CONNECTED') {
        setIsConnected(true);
      } else if (data.type === 'WS_DISCONNECTED' || data.type === 'WS_ERROR') {
        setIsConnected(false);
      } else if (data.type === 'HANDSHAKE') {
        setIsConnected(true);
        if (data.simulator_status) {
          setSimulatorStatus(data.simulator_status);
        }
      } else if (data.type === 'TELEMETRY_UPDATE') {
        if (data.batch) {
          setLatestBatch(data.batch);
        }
        if (data.simulator_status) {
          setSimulatorStatus(data.simulator_status);
        }
      }
    });

    // Fallback polling for simulator status every 5 seconds
    const interval = setInterval(refreshSimulatorStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        isConnected,
        latestBatch,
        simulatorStatus,
        refreshSimulatorStatus,
        triggerDemoMode,
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
