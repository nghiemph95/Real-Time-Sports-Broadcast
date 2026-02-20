function CommentaryItem({ item }) {
  const minute = item.minute ?? '?';
  const message = item.message ?? '';
  const actor = item.actor;
  const team = item.team;
  const eventType = item.eventType ?? item.event_type;

  return (
    <div className="flex gap-3 py-3 border-b border-surface-800/80 last:border-0">
      <div className="flex-shrink-0 w-10 text-right">
        <span className="font-display font-semibold text-accent-amber tabular-nums">{minute}'</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-surface-200 text-sm leading-snug">{message}</p>
        {(actor || team || eventType) && (
          <p className="text-xs text-surface-500 mt-1">
            {[eventType, actor, team].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

export function CommentaryFeed({ items, loading, error, isLive }) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 font-medium">Failed to load commentary</p>
        <p className="text-sm text-surface-400 mt-1">{error.message || String(error)}</p>
      </div>
    );
  }

  if (loading && !items?.length) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-4 bg-surface-700 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-700 rounded w-full" />
              <div className="h-3 bg-surface-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-800 flex items-center justify-between">
        <h3 className="font-display font-semibold text-white">Commentary</h3>
        {isLive && (
          <span className="text-xs font-medium text-accent-red flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-4">
        {!items?.length && !loading ? (
          <p className="text-surface-500 text-sm text-center py-8">No commentary yet.</p>
        ) : (
          <div className="space-y-0">
            {(items || []).map((item) => (
              <CommentaryItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
