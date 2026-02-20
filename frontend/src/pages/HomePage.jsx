import { useState, useEffect } from 'react';
import { getMatches } from '../api/client';
import { useWS } from '../context/WebSocketContext';
import { MatchList } from '../components/MatchList';
import { Layout } from '../components/Layout';

export function HomePage() {
  const { connectionStatus, setOnMatchCreated } = useWS();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMatches(50)
      .then((res) => {
        if (!cancelled && res?.data) setMatches(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setOnMatchCreated((data) => {
      setMatches((prev) => {
        if (!data?.id) return prev;
        if (prev.some((m) => m.id === data.id)) return prev;
        return [data, ...prev];
      });
    });
    return () => setOnMatchCreated(null);
  }, [setOnMatchCreated]);

  return (
    <Layout connectionStatus={connectionStatus}>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
          Matches
        </h1>
        <p className="text-surface-400 mt-1 text-sm">
          Click a match to view live commentary.
        </p>
      </div>
      <MatchList matches={matches} loading={loading} error={error} />
    </Layout>
  );
}
