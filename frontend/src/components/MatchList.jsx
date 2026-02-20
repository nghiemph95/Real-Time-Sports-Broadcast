import { MatchCard } from './MatchCard';

export function MatchList({ matches, loading, error }) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 font-medium">Failed to load matches</p>
        <p className="text-sm text-surface-400 mt-1">{error.message || String(error)}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-800 bg-surface-900/50 p-5 animate-pulse"
          >
            <div className="h-4 w-16 bg-surface-700 rounded mb-3" />
            <div className="flex justify-between gap-4">
              <div className="h-5 w-24 bg-surface-700 rounded" />
              <div className="h-8 w-20 bg-surface-700 rounded" />
              <div className="h-5 w-24 bg-surface-700 rounded" />
            </div>
            <div className="h-3 w-12 bg-surface-700 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (!matches?.length) {
    return (
      <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-12 text-center">
        <p className="text-surface-400">No matches yet.</p>
        <p className="text-sm text-surface-500 mt-1">Run seed or create matches via API.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
