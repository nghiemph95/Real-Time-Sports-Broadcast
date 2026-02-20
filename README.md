# Real-Time Sports Broadcast

Ứng dụng phát sóng trực tiếp thể thao: REST API + WebSocket cho matches và commentary, dashboard React xem trận và bình luận real-time.

## Công nghệ

- **Backend:** Node.js (ESM), Express, WebSocket (ws), Drizzle ORM, Neon (PostgreSQL)
- **Frontend:** Vite, React, React Router, Tailwind CSS
- **Bảo mật:** Arcjet (rate limit, bot detection — tùy chọn)

## Yêu cầu

- **Node.js** 18+ (khuyến nghị 20 hoặc 24; project có `nvmrc` với Node 24)
- **Tài khoản Neon** để tạo PostgreSQL (miễn phí): [neon.tech](https://neon.tech)
- Git

## Khởi tạo dự án

### 1. Clone và cài dependency

```bash
git clone https://github.com/nghiemph95/Real-Time-Sports-Broadcast.git
cd Real-Time-Sports-Broadcast
```

Nếu dùng nvm:

```bash
nvm use
```

Cài dependency **backend** (tại thư mục gốc):

```bash
npm install
```

Cài dependency **frontend**:

```bash
cd frontend
npm install
cd ..
```

### 2. Cấu hình môi trường

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Chỉnh `.env` với các biến sau:

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DATABASE_URL` | **Có** | Connection string PostgreSQL từ Neon (Dashboard → Connect). Dạng: `postgresql://user:pass@host/db?sslmode=require` |
| `PORT` | Không | Cổng server (mặc định `8000`) |
| `HOST` | Không | Bind address (mặc định `0.0.0.0`) |
| `CORS_ORIGIN` | Không | Domain frontend khi deploy production, cách nhau bằng dấu phẩy |
| `API_URL` | Không | URL backend khi chạy seed từ máy/CI (mặc định `http://127.0.0.1:8000`) |
| `ARCJET_KEY` | Không | Key Arcjet (chỉ cần khi bật bảo mật production) |
| `SEED_SECRET` | Không | Secret để bảo vệ API start/stop seed (production) |

Ví dụ `.env` tối thiểu:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
PORT=8000
```

### 3. Database: migration

Tạo bảng từ schema (Drizzle):

```bash
npm run db:generate
npm run db:migrate
```

- `db:generate`: tạo file migration trong `drizzle/` từ `src/db/schema.js`.
- `db:migrate`: áp dụng migration lên database (Neon).

## Chạy dự án

### Backend (API + WebSocket)

Tại thư mục gốc:

```bash
npm run dev
```

- Server chạy tại **http://localhost:8000** (hoặc `PORT` trong `.env`).
- REST: `GET/POST /matches`, `GET/POST /matches/:id/commentary`, `PATCH /matches/:id/score`.
- WebSocket: kết nối `ws://localhost:8000/ws`, subscribe theo `matchId` để nhận commentary và cập nhật tỉ số.

Chạy production (không watch):

```bash
npm start
```

### Frontend (Dashboard)

Mở terminal thứ hai, tại thư mục gốc:

```bash
npm run dev:frontend
```

Hoặc:

```bash
cd frontend && npm run dev
```

- Dashboard chạy tại **http://localhost:5173**.
- Vite proxy `/api` và `/ws` tới `http://localhost:8000`, không cần cấu hình thêm khi dev.

### Seed dữ liệu

Seed tạo matches và đẩy commentary (từ `src/data/data.js`) vào API, đồng thời cập nhật tỉ số qua PATCH `/matches/:id/score`.

**Cách 1 — CLI (backend đang chạy):**

```bash
npm run seed
```

**Cách 2 — Giao diện (production / long-running server):**

1. Vào dashboard → link **Seed** trên header (hoặc `/seed`).
2. Bấm **Bắt đầu** để chạy seed nền, **Dừng** để dừng.

Lưu ý: Seed từ UI chỉ hoạt động khi backend chạy **long-running** (Railway, Render, local). Không hỗ trợ trên Vercel serverless.

Biến môi trường seed (tùy chọn):

- `DELAY_MS`: độ trễ giữa mỗi commentary (ms, mặc định `250`).
- `SEED_FORCE_LIVE`: `1` hoặc `true` để chỉ xử lý trận đang live.
- `API_URL`: URL backend khi seed gọi từ máy khác (ví dụ production).

## Scripts chính

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Chạy backend với watch (tự reload khi đổi code) |
| `npm run dev:frontend` | Chạy frontend Vite (port 5173) |
| `npm start` | Chạy backend production |
| `npm run seed` | Chạy seed từ CLI (cần backend đang chạy) |
| `npm run db:generate` | Tạo migration từ schema |
| `npm run db:migrate` | Áp dụng migration lên DB |
| `npm run db:studio` | Mở Drizzle Studio (xem/sửa DB) |
| `npm run demo` | Chạy CRUD demo (Drizzle) |

Frontend (trong `frontend/`):

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Dev server + proxy |
| `npm run build` | Build production (output `dist/`) |
| `npm run preview` | Xem bản build |

## Cấu trúc thư mục (tóm tắt)

```
├── src/
│   ├── app.js              # Express app (REST only, dùng cho Vercel serverless)
│   ├── index.js            # Entry: server HTTP + gắn WebSocket
│   ├── db/                 # Drizzle: schema, db client
│   ├── route/              # Express routes: matches, commentary, seed
│   ├── ws/                 # WebSocket server (subscribe, broadcast)
│   ├── seed/               # Logic seed (CLI + runSeed cho API)
│   ├── data/               # Data giả (matches + commentary)
│   └── validation/         # Zod schemas
├── frontend/               # Vite + React app
│   ├── src/
│   │   ├── api/            # Client API + WebSocket
│   │   ├── components/
│   │   ├── pages/
│   │   └── context/
│   └── dist/               # Build output
├── api/                    # Vercel serverless (api/[[...path]].js)
├── drizzle/                # Migration files
├── docs/                   # Tài liệu (deploy, API, WebSocket, Arcjet…)
├── .env.example
├── drizzle.config.js
├── vercel.json             # Deploy full Vercel (frontend + API)
└── package.json
```

## Deploy

- **Frontend:** Vercel (khuyến nghị).
- **Backend (REST + WebSocket):** Railway hoặc Render (long-running + WebSocket).
- **Chỉ Vercel:** Có thể deploy toàn bộ lên Vercel (một domain); khi đó **không có WebSocket** (chỉ REST), frontend có thể dùng polling.

Chi tiết từng bước, biến môi trường production và CORS: xem **`docs/deploy-vercel-production.md`**.

## Tài liệu thêm

- `docs/rest-api-matches-commentary.md` — REST API matches & commentary
- `docs/websocket-flow.md` — Luồng WebSocket (subscribe, broadcast)
- `docs/arcjet.md` — Cấu hình Arcjet (HTTP + WebSocket)
- `docs/drizzle-neon-setup.md` — Neon + Drizzle
- `docs/deploy-vercel-production.md` — Deploy Vercel (+ Railway)

## License

ISC
