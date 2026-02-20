# Live Sports Dashboard

Frontend for **Real-Time Sports Broadcast**: list matches, view live commentary over WebSocket.

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router
- Native WebSocket + fetch (API)

## Setup

```bash
cd frontend
npm install
```

## Run (dev)

1. Start the **backend** first (from repo root):
   ```bash
   npm run dev
   ```
   Backend runs at `http://localhost:8000`.

2. Start the frontend:
   ```bash
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`. Vite proxies `/api` → backend and `/ws` → backend WebSocket.

3. Open [http://localhost:5173](http://localhost:5173).

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build

## Production (Vercel)

Khi deploy frontend lên Vercel, set **Environment Variables** trong Vercel Dashboard:

- **`VITE_API_URL`** = URL backend production (vd: `https://your-api.railway.app`) — bắt buộc để app gọi đúng API.
- **`VITE_WS_URL`** (optional) = URL WebSocket (vd: `wss://your-api.railway.app/ws`). Nếu không set, app tự suy từ `VITE_API_URL`.

Backend (Express + WebSocket) nên deploy ở Railway / Render / Fly.io, không trên Vercel. Chi tiết: **docs/deploy-vercel-production.md** (ở repo root).

## Data

- **Matches:** `GET /api/matches` (proxied to backend).
- **Commentary:** `GET /api/matches/:id/commentary` + WebSocket events `commentary` after `subscribe(matchId)`.
- **New matches:** WebSocket event `match_created` updates the list in real time.

Ensure the backend has data (e.g. `npm run seed` from repo root).
