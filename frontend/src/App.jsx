import { Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import { HomePage } from './pages/HomePage';
import { MatchDetailPage } from './pages/MatchDetailPage';

export default function App() {
  return (
    <WebSocketProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/matches/:id" element={<MatchDetailPage />} />
      </Routes>
    </WebSocketProvider>
  );
}
