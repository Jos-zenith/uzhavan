import React from 'react';
import '../styles/roiConsoleNav.css';

interface Props {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const RoiConsoleNav: React.FC<Props> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: '📊 Portfolio', icon: '📊' },
    { id: 'feature-detail', label: '📈 Feature Detail', icon: '📈' },
    { id: 'telemetry-live', label: '📡 Telemetry', icon: '📡' },
    { id: 'kpi-catalog', label: '📚 KPI Catalog', icon: '📚' },
    { id: 'create-spec', label: '✨ Create Spec', icon: '✨' },
  ];

  return (
    <nav className="roi-console-nav">
      <div className="nav-header">
        <div className="nav-title">🚀 ROI Console</div>
      </div>

      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              className={`nav-link ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              aria-label={item.label}
              data-tooltip={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label.split(' ').length > 1 ? item.label.split(' ')[1] : item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="nav-footer">
        <div className="nav-info">
          <p className="info-text">Feature ROI Console v1.0</p>
          <p className="info-status">Production Ready</p>
        </div>
      </div>
    </nav>
  );
};
