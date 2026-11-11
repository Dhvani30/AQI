import type { ReactNode } from 'react';

interface SectionStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  label: string;
  children: ReactNode;
}

export default function SectionState({ loading, error, onRetry, label, children }: SectionStateProps) {
  if (loading) {
    return (
      <div className="section-skeleton" role="status" aria-label={`Loading ${label}`}>
        <span /><span /><span />
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return children;
}
