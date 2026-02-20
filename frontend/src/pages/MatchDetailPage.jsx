import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatches, getCommentary } from '../api/client';
import { useWS } from '../context/WebSocketContext';
import { Layout } from '../components/Layout';
import { CommentaryFeed } from '../components/CommentaryFeed';
import { MatchStatusBadge } from '../components/MatchStatusBadge';

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function MatchDetailPage() {
  const { id } = useParams();
  const matchId = id ? parseInt(id, 10) : null;
  const { connectionStatus, subscribe, unsubscribe, setOnCommentary } = useWS();

  const [match, setMatch] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [loadingCommentary, setLoadingCommentary] = useState(true);
  const [errorMatch, setErrorMatch] = useState(null);
  const [errorCommentary, setErrorCommentary] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setLoadingMatch(true);
    setErrorMatch(null);
    getMatches(200)
      .then((res) => {
        if (!cancelled && res?.data) {
          const m = res.data.find((x) => x.id === matchId);
          setMatch(m ?? null);
        }
      })
      .catch((err) => { if (!cancelled) setErrorMatch(err); })
      .finally(() => { if (!cancelled) setLoadingMatch(false); });
    return () => { cancelled = true; };
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setLoadingCommentary(true);
    setErrorCommentary(null);
    getCommentary(matchId, 100)
      .then((res) => {
        if (!cancelled && res?.data) setCommentary(res.data);
      })
      .catch((err) => { if (!cancelled) setErrorCommentary(err); })
      .finally(() => { if (!cancelled) setLoadingCommentary(false); });
    return () => { cancelled = true; };
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    setOnCommentary((data) => {
      if (data?.matchId === matchId) {
        setCommentary((prev) => [...prev, data]);
      }
    });
    subscribe(matchId);
    return () => {
      unsubscribe();
      setOnCommentary(null);
    };
  }, [matchId, subscribe, unsubscribe, setOnCommentary]);

  if (!matchId) {
    return (
      <Layout connectionStatus={connectionStatus}>
        <p className="text-surface-400">Invalid match.</p>
        <Link to="/" className="text-accent-green hover:underline mt-2 inline-block">Back to matches</Link>
      </Layout>
    );
  }

  const isLoading = loadingMatch;
  const err = errorMatch || errorCommentary;

  return (
    <Layout connectionStatus={connectionStatus}>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-surface-400 hover:text-white text-sm mb-6"
      >
        ← Back to matches
      </Link>

      {isLoading && !match && (
        <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-8 animate-pulse">
          <div className="h-6 w-32 bg-surface-700 rounded mb-4" />
          <div className="flex justify-between gap-4">
            <div className="h-8 w-40 bg-surface-700 rounded" />
            <div className="h-10 w-24 bg-surface-700 rounded" />
            <div className="h-8 w-40 bg-surface-700 rounded" />
          </div>
        </div>
      )}

      {match && (
        <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6 mb-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-surface-400">
              {match.sport}
            </span>
            <MatchStatusBadge status={match.status} />
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-lg text-white truncate">
                {match.homeTeam ?? match.home_team}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800">
              <span className="font-display font-bold text-2xl tabular-nums text-white">
                {match.homeScore ?? match.home_score ?? 0}
              </span>
              <span className="text-surface-500">–</span>
              <span className="font-display font-bold text-2xl tabular-nums text-white">
                {match.awayScore ?? match.away_score ?? 0}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-display font-bold text-lg text-white truncate">
                {match.awayTeam ?? match.away_team}
              </p>
            </div>
          </div>
          <p className="text-sm text-surface-500 mt-2">{formatTime(match.startTime ?? match.start_time)}</p>
        </div>
      )}

      <CommentaryFeed
        items={commentary}
        loading={loadingCommentary && !commentary.length}
        error={errorCommentary}
        isLive={connectionStatus === 'connected'}
      />
    </Layout>
  );
}
