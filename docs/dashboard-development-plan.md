# Kế hoạch phát triển Dashboard — Real-Time Sports Broadcast

Tài liệu lên kế hoạch xây dựng **giao diện frontend** (dashboard) hiện đại để hiển thị trận đấu và commentary real-time, cùng các lựa chọn **nguồn dữ liệu** (API hiện có, API bên ngoài, AI/synthetic).

---

## 1. Mục tiêu Dashboard

| Mục tiêu | Mô tả |
|----------|--------|
| **Hiển thị danh sách trận** | Card/list matches (sport, homeTeam, awayTeam, score, status, thời gian). |
| **Live commentary** | Khi user chọn một trận → subscribe WebSocket → stream commentary real-time (minute, message, actor, team, eventType). |
| **Real-time cập nhật** | Trận mới (match_created) và commentary mới (commentary) push qua WebSocket, không cần refresh. |
| **Trải nghiệm hiện đại** | Giao diện gọn, dễ đọc, responsive; có thể dark/light theme, animation nhẹ. |

---

## 2. Nguồn dữ liệu — Các lựa chọn

### 2.1. Nguồn hiện có (đã build)

- **REST API:** `GET /matches`, `GET /matches/:id/commentary` — dữ liệu từ **Neon Postgres** (Drizzle).
- **WebSocket:** `ws://host/ws` — nhận event `match_created`, `commentary` real-time sau khi subscribe `matchId`.
- **Seed data:** Script `npm run seed` + `src/data/data.js` — có sẵn dataset matches/commentary để dev/demo.

**Kết luận:** Dashboard có thể dùng **chỉ API + WS hiện tại** để hoạt động đầy đủ. Data được tạo bằng seed hoặc POST từ admin/tool.

---

### 2.2. API bên ngoài (external)

Dùng API bên thứ ba để lấy lịch trận / kết quả / events thật, sau đó đồng bộ vào DB (cron job hoặc worker) và vẫn phát qua WebSocket cho FE.

| Nguồn | Mô tả | Lưu ý |
|-------|--------|--------|
| **API-Football** (api-football.com) | Fixtures, live, standings, nhiều giải. | API key, rate limit; có free tier. |
| **API-Sports** (api-sports.io) | Football, NBA, NHL, etc. | Key, rate limit; free tier giới hạn. |
| **The Odds API** | Tỉ lệ kèo, một số event thể thao. | Key; phù hợp bổ sung odds hơn là commentary. |
| **OpenLigaDB** | Bundesliga (Đức) — free, không key. | Chỉ một giải, format đơn giản. |

**Cách tích hợp:**

1. Tạo **sync job** (cron/script): gọi API external → map response → `POST /matches` hoặc insert DB trực tiếp.
2. Commentary: nhiều API trả **events** (goal, card, substitution). Map sang schema `commentary` (minute, message, eventType, actor, team) và gọi `POST /matches/:id/commentary` hoặc insert DB rồi gọi `broadcastCommentary`.
3. **Không** gọi API external trực tiếp từ browser (CORS, key lộ). Mọi thứ qua backend.

---

### 2.3. AI / Synthetic data

Dùng AI hoặc logic sinh dữ liệu để tạo matches/commentary **giả lập** (demo, testing, hoặc khi chưa có API thật).

| Cách | Mô tả |
|------|--------|
| **LLM (GPT/Claude, etc.)** | Prompt: "Generate 5 football matches with teams and times" / "Generate 10 commentary events for minute 1–15". Backend gọi AI API → parse JSON → POST vào API hoặc DB. Dùng cho seed one-off hoặc script. |
| **Rule-based generator** | Script (không cần AI): template message ("Goal by {actor} ({team}) at {minute}'"), random team/player từ list, random minute. Nhanh, ổn định, không tốn API AI. |
| **Kết hợp** | Seed data tĩnh (như `data.js`) + script rule-based sinh thêm commentary theo thời gian (setInterval) để giả lập "live". |

**Ví dụ flow AI (optional):**

```
Cron / Admin trigger
  → Backend gọi LLM: "Generate 3 upcoming football matches JSON"
  → Parse response → POST /matches (x3)
  → WebSocket broadcast match_created (x3)
  → FE cập nhật danh sách
```

---

### 2.4. Khuyến nghị theo giai đoạn

| Giai đoạn | Nguồn dữ liệu |
|-----------|----------------|
| **Phase 1 – MVP** | Chỉ REST + WebSocket + **seed data** (`npm run seed`). Đủ để dashboard hoạt động, test UI và real-time. |
| **Phase 2 – Mở rộng** | Thêm **sync job** với 1 API external (vd: API-Football free tier) để có lịch/kết quả thật; commentary có thể vẫn từ API events hoặc rule-based. |
| **Phase 3 – Tùy chọn** | AI-generated matches/commentary cho demo đặc biệt; hoặc tích hợp thêm API khác. |

---

## 3. Tech stack Frontend (đề xuất)

| Thành phần | Đề xuất | Lý do |
|------------|---------|--------|
| **Framework** | **React 18** + **Vite** | Nhanh, ecosystem lớn, dễ bảo trì. |
| **Styling** | **Tailwind CSS** | Utility-first, giao diện hiện đại nhanh, responsive dễ. |
| **State** | **React state + hooks** | Đủ cho list matches + commentary; có thể thêm React Query (TanStack Query) cho cache REST. |
| **WebSocket** | **Native `WebSocket`** hoặc `useEffect` + ref | Kết nối `ws://...`, subscribe/unsubscribe theo `matchId`, xử lý envelope (type, data). |
| **HTTP** | `fetch` hoặc **Axios** | Gọi GET /matches, GET /matches/:id/commentary. |
| **Routing** | **React Router** | Route: `/` (list matches), `/matches/:id` (chi tiết + live commentary). |

**Alternatives:** Vue 3 + Vite, SvelteKit — nếu team quen hơn; contract API/WS giữ nguyên.

---

## 4. Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Dashboard)                       │
│  React + Vite │ Tailwind │ React Router │ fetch + WebSocket       │
└───────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │ HTTP              │ WebSocket          │
         │ GET /matches      │ ws://host/ws       │
         │ GET /matches/:id  │ subscribe(matchId) │
         │   /commentary    │ → commentary stream │
         └───────────────────┼────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    Backend (đã có sẵn)                          │
│  Express │ REST (matches, commentary) │ WebSocket (broadcast)   │
│  Drizzle │ Neon Postgres │ Arcjet                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ Data: Seed / API sync / AI  │
              └─────────────────────────────┘
```

---

## 5. Phân phase phát triển

### Phase 1 — MVP Dashboard (2–3 tuần)

| Bước | Nội dung |
|------|----------|
| 1.1 | Khởi tạo project FE: Vite + React, Tailwind, React Router. Cấu hình proxy (optional) tới backend `http://localhost:8000`. |
| 1.2 | **Trang danh sách trận:** Gọi `GET /matches`, hiển thị card (sport, homeTeam, awayTeam, score, status, startTime). Filter/sort (optional). |
| 1.3 | **Trang chi tiết trận:** Route `/matches/:id`. Gọi `GET /matches/:id/commentary?limit=50`, hiển thị list commentary (minute, message, actor, team, eventType). |
| 1.4 | **WebSocket:** Kết nối `ws://...`, xử lý `welcome`. Khi vào trang chi tiết `matchId` → gửi `{ type: "subscribe", matchId }`, nhận `commentary` → append vào list. Khi rời trang → `unsubscribe`. |
| 1.5 | **Match created:** Lắng nghe `match_created` → thêm match vào đầu danh sách (hoặc refetch GET /matches). |
| 1.6 | UI polish: status badge (scheduled/live/finished), màu, typography, responsive. |

**Deliverable:** User mở dashboard → xem danh sách trận → vào một trận → xem commentary và nhận commentary mới real-time; trận mới xuất hiện khi có event.

---

### Phase 2 — Cải thiện UX & data (1–2 tuần)

| Bước | Nội dung |
|------|----------|
| 2.1 | **Score update:** Nếu backend đã có `broadcastScoreUpdate`, FE lắng nghe (envelope type mới) và cập nhật score trên card/header. |
| 2.2 | Reconnect WebSocket khi mất kết nối; hiển thị trạng thái "Connecting" / "Live" / "Disconnected". |
| 2.3 | Loading / empty state; error boundary; toast khi lỗi. |
| 2.4 | (Optional) Tích hợp **external API:** script/cron sync fixtures từ API-Football (hoặc tương đương) → POST /matches; map events → commentary. |

---

### Phase 3 — Mở rộng (tùy chọn)

| Bước | Nội dung |
|------|----------|
| 3.1 | **AI/synthetic:** Script hoặc admin page gọi backend endpoint “generate demo” → backend gọi LLM hoặc rule-based → tạo matches/commentary → broadcast. |
| 3.2 | Dark/light theme; preferences lưu localStorage. |
| 3.3 | Filters (theo sport, status); search; pagination nếu list lớn. |

---

## 6. Cấu trúc thư mục Frontend (đề xuất)

```text
frontend/                 # hoặc client/ / web/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api/
│   │   ├── matches.js      # fetch GET /matches, GET /matches/:id/commentary
│   │   └── ws.js           # WebSocket hook/helper, subscribe/unsubscribe
│   ├── components/
│   │   ├── MatchCard.jsx
│   │   ├── MatchList.jsx
│   │   ├── CommentaryFeed.jsx
│   │   ├── LiveBadge.jsx
│   │   └── Layout.jsx
│   ├── pages/
│   │   ├── HomePage.jsx    # list matches
│   │   └── MatchDetailPage.jsx  # commentary + subscribe WS
│   └── styles/
│       └── index.css
```

---

## 7. Tóm tắt

| Câu hỏi | Trả lời |
|---------|---------|
| **Data từ đâu cho dashboard?** | **Ngắn hạn:** REST + WebSocket + seed data (đã đủ). **Sau đó:** sync từ API external (API-Football, etc.) hoặc AI/rule-based sinh data. |
| **Có nên dùng AI?** | Có thể: AI dùng để **sinh** matches/commentary (demo hoặc seed), gọi từ backend; không bắt buộc cho MVP. |
| **Lộ trình?** | Phase 1: MVP (list + detail + WS live). Phase 2: UX + optional external API. Phase 3: AI/synthetic, theme, filter. |
| **Stack FE?** | React + Vite + Tailwind + React Router; fetch + WebSocket native (hoặc hook). |

**Đã triển khai:** Frontend nằm trong thư mục `frontend/` (Vite + React + Tailwind + React Router). Chạy backend `npm run dev`, rồi `npm run dev:frontend` (hoặc `cd frontend && npm run dev`). Mở http://localhost:5173. Tài liệu REST: **docs/rest-api-matches-commentary.md**. WebSocket: **docs/websocket-flow.md**.
