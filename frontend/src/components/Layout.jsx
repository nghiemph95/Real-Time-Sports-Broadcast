import { Link } from 'react-router-dom';
import { LiveBadge } from './LiveBadge';

export function Layout({ children, connectionStatus }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-800 bg-surface-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="font-display font-bold text-xl text-white hover:text-accent-green transition-colors"
          >
            Live Sports
          </Link>
          <div className="flex items-center gap-3">
            <LiveBadge status={connectionStatus} />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="border-t border-surface-800 py-3 text-center text-surface-400 text-sm">
        Real-Time Sports Broadcast — WebSocket + REST
      </footer>
    </div>
  );
}
