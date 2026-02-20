export function LiveBadge({ status }) {
  const config = {
    disconnected: { label: 'Offline', className: 'bg-surface-700 text-surface-400' },
    connecting: { label: 'Connecting…', className: 'bg-amber-500/20 text-amber-400 animate-pulse' },
    connected: { label: 'Live', className: 'bg-accent-green/20 text-accent-green' },
  };
  const { label, className } = config[status] || config.disconnected;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      title={status === 'connected' ? 'WebSocket connected' : status}
    >
      {status === 'connected' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  );
}
