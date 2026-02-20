import { Link } from 'react-router-dom';
import { MatchStatusBadge } from './MatchStatusBadge';

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function MatchCard({ match }) {
  const id = match.id;
  const sport = match.sport || 'sport';
  const homeTeam = match.homeTeam ?? match.home_team ?? '—';
  const awayTeam = match.awayTeam ?? match.away_team ?? '—';
  const homeScore = match.homeScore ?? match.home_score ?? 0;
  const awayScore = match.awayScore ?? match.away_score ?? 0;
  const status = match.status || 'scheduled';
  const startTime = match.startTime ?? match.start_time;

  return (
    <Link
      to={`/matches/${id}`}
      className="block rounded-xl border border-surface-800 bg-surface-900/50 hover:bg-surface-800/80 hover:border-surface-700 transition-all p-4 sm:p-5 group"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-surface-400">
          {sport}
        </span>
        <MatchStatusBadge status={status} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 text-left">
          <p className="font-display font-semibold text-white truncate group-hover:text-accent-green transition-colors">
            {homeTeam}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-800">
          <span className="font-display font-bold text-lg tabular-nums text-white">
            {homeScore}
          </span>
          <span className="text-surface-500">–</span>
          <span className="font-display font-bold text-lg tabular-nums text-white">
            {awayScore}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-display font-semibold text-white truncate group-hover:text-accent-green transition-colors">
            {awayTeam}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-surface-500">{formatTime(startTime)}</p>
    </Link>
  );
}
