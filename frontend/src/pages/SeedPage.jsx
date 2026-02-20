import { useState, useEffect, useCallback } from 'react';
import { getSeedStatus, startSeed, stopSeed } from '../api/client';
import { Layout } from '../components/Layout';

const POLL_INTERVAL_MS = 2000;

export function SeedPage() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getSeedStatus();
      setRunning(Boolean(res?.running));
      setError(null);
    } catch (err) {
      setError(err);
      setRunning(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [running, fetchStatus]);

  const handleStart = async () => {
    setActionError(null);
    try {
      await startSeed();
      setRunning(true);
    } catch (err) {
      setActionError(err);
    }
  };

  const handleStop = async () => {
    setActionError(null);
    try {
      await stopSeed();
      setRunning(false);
    } catch (err) {
      setActionError(err);
    }
  };

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Seed (production)
        </h1>
        <p className="text-surface-400 text-sm mb-6">
          Chạy hoặc dừng seed từ giao diện. Chỉ hoạt động khi backend chạy long-running (Railway, local); không hỗ trợ Vercel serverless.
        </p>

        {loading ? (
          <p className="text-surface-400">Đang tải trạng thái…</p>
        ) : error ? (
          <div className="rounded-lg bg-red-900/20 border border-red-800 text-red-200 p-4 text-sm">
            <p className="font-medium">Không thể kết nối API seed</p>
            <p className="mt-1">{error.message}</p>
            <p className="mt-2 text-surface-400">
              Kiểm tra backend đang chạy và có route /seed (long-running server).
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  running ? 'bg-emerald-500 animate-pulse' : 'bg-surface-500'
                }`}
              />
              <span className="text-white font-medium">
                {running ? 'Đang chạy' : 'Đã dừng'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={running}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
              >
                Bắt đầu
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!running}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 transition-colors"
              >
                Dừng
              </button>
            </div>
            {actionError && (
              <p className="mt-3 text-red-400 text-sm">
                {actionError.message}
                {actionError.body?.error && ` — ${actionError.body.error}`}
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
