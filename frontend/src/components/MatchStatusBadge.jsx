const STATUS_STYLES = {
  scheduled: 'bg-surface-700 text-surface-300',
  live: 'bg-accent-red/20 text-accent-red',
  finished: 'bg-surface-700 text-surface-400',
};

export function MatchStatusBadge({ status }) {
  const s = (status || 'scheduled').toLowerCase();
  const className = STATUS_STYLES[s] || STATUS_STYLES.scheduled;
  const label = s === 'live' ? 'Live' : s === 'finished' ? 'FT' : 'Scheduled';

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
