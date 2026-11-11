import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="AI-AQI home">
          <span className="wordmark-mark" aria-hidden="true">A</span>
          <span><strong>AI-AQI</strong><small>Air near you</small></span>
        </a>
        <span className="header-caption">NEARBY AIR QUALITY</span>
        <span className="header-indicator"><span /> LIVE DATA</span>
      </header>
      <main className="dashboard-content">{children}</main>
      <footer className="app-footer">
        <span>Air readings can vary by station and update time.</span>
        <span>Location is requested only when you ask.</span>
      </footer>
    </div>
  );
}
