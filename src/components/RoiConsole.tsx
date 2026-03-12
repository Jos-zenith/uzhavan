import React, { useState } from 'react';
import {
  FeatureRoiDashboard,
  FeatureDetailScreen,
  TelemetryLiveViewScreen,
  KpiCatalogScreen,
  CreateFeatureSpecWizard,
} from '../screens';
import { RoiConsoleNav } from './RoiConsoleNav';
import '../styles/roiConsole.css';

export const RoiConsole: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('WEATHER_FORECAST');

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
  };

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const handleNavigateToDetail = (screen: string) => {
    if (screen === 'feature-detail') {
      setCurrentScreen('feature-detail');
    } else {
      setCurrentScreen(screen);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <FeatureRoiDashboard
            onSelectFeature={handleSelectFeature}
            onNavigate={handleNavigateToDetail}
          />
        );
      case 'feature-detail':
        return (
          <FeatureDetailScreen
            featureId={selectedFeatureId}
            onNavigateBack={() => setCurrentScreen('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      case 'telemetry-live':
        return (
          <TelemetryLiveViewScreen
            onNavigateBack={() => setCurrentScreen('dashboard')}
          />
        );
      case 'kpi-catalog':
        return (
          <KpiCatalogScreen
            onNavigateBack={() => setCurrentScreen('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      case 'create-spec':
        return (
          <CreateFeatureSpecWizard
            onNavigateBack={() => setCurrentScreen('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <FeatureRoiDashboard
            onSelectFeature={handleSelectFeature}
            onNavigate={handleNavigateToDetail}
          />
        );
    }
  };

  return (
    <div className="roi-console">
      <RoiConsoleNav currentScreen={currentScreen} onNavigate={handleNavigate} />
      <div className="roi-console-content">
        {renderScreen()}
      </div>
    </div>
  );
};
