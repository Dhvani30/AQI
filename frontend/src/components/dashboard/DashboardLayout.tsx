import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  navigation?: ReactNode;
}

export default function DashboardLayout({ children, navigation }: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="AI-AQI home">
          <span><strong>AI-AQI</strong></span>
        </a>
        <span className="header-indicator"><span /> LIVE</span>
      </header>
      <main className="dashboard-content">{children}</main>
      {navigation}
      <footer className="app-footer">
        <span>Air readings can vary by station and update time.</span>
        <span>When you request a location fix, its coordinates are stored in location history.</span>
      </footer>
    </div>
  );
}
