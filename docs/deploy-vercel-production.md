# Deploy lên Production và API_URL

Tài liệu mô tả cách deploy **frontend** và **backend**, cấu hình **API_URL**, và nên dùng **Console hay SDK/CLI**.

---

## 1. Nên deploy lên đâu?

### Khuyến nghị tổng thể

| Phần | Nền tảng khuyến nghị | Lý do |
|------|----------------------|--------|
| **Frontend** (React + Vite) | **Vercel** | Zero-config cho Vite/React, preview deploy theo branch, env vars dễ set, free tier rộng. |
| **Backend** (Express + WebSocket) | **Railway** (ưu tiên) hoặc **Render** | Cần process chạy lâu + WebSocket. Railway: free tier, WebSocket ổn, deploy từ Git rất nhanh. Render: free tier có sleep; WebSocket tốt trên paid. |

### So sánh nhanh backend

| Nền tảng | WebSocket | Free tier | Độ dễ | Ghi chú |
|----------|-----------|-----------|--------|--------|
| **Railway** | ✅ | Có (giới hạn usage) | Rất dễ | Connect repo → build Node → chạy. Nên chọn đầu tiên. |
| **Render** | ✅ (paid ổn hơn) | Có, service sleep sau 15 phút không request | Dễ | Free phù hợp dev/demo; production nên paid. |
| **Fly.io** | ✅ | Có | Trung bình | CLI + Docker; linh hoạt, nhiều region. |
| **Vercel** | ❌ không phù hợp | — | — | Serverless không giữ WebSocket lâu; chỉ dùng cho frontend. |

**Kết luận:** Frontend → **Vercel**. Backend → **Railway** (hoặc Render nếu bạn đã quen). Cả hai đều dùng **Console (Dashboard)** là chính; CLI dùng khi cần script hoặc deploy từ terminal.

---

## 2. Dùng Console hay SDK/CLI?

### Nên dùng gì?

| Cách | Khi nào dùng |
|------|----------------|
| **Console (Dashboard web)** | **Nên dùng hàng ngày:** kết nối repo, xem build/deploy, set env vars, xem logs, đổi domain. Đủ cho hầu hết dự án. |
| **CLI** (Vercel CLI, Railway CLI) | Khi muốn deploy từ terminal (`vercel`, `railway up`), link project local, hoặc tích hợp CI/script. |
| **SDK/API** | Khi cần tích hợp vào tool tự viết (CI tùy chỉnh, automation). Vercel/Railway có REST API; ít khi cần cho setup cơ bản. |

### Gợi ý cho từng phần

- **Frontend (Vercel):**
  - **Console:** Import project từ GitHub → Vercel tự build (root hoặc `frontend/`), set `VITE_API_URL`, `VITE_WS_URL` trong Settings → Environment Variables. Mỗi lần push main (hoặc PR) → auto deploy.
  - **CLI:** Cài `npm i -g vercel`, chạy `vercel` trong thư mục `frontend/` nếu muốn deploy tay từ máy. Vẫn nên set env trên Console.
- **Backend (Railway):**
  - **Console:** New Project → Deploy from GitHub repo → chọn repo, root directory (hoặc để mặc định), thêm env: `DATABASE_URL`, `PORT`, `ARCJET_KEY`, … Railway tự detect Node, chạy `npm start` (hoặc build command bạn cấu hình). Lấy URL public trong Settings.
  - **CLI:** `railway login` → `railway link` → `railway up` để deploy từ máy. Env vẫn nên quản lý trên Console cho rõ ràng.

**Tóm lại:** Ưu tiên **Console** cho cả Vercel và Railway (connect repo, env, logs). Dùng **CLI** khi bạn thích deploy từ terminal hoặc cần automation.

---

## 3. Kiến trúc production

- **Frontend (Dashboard):** Deploy lên **Vercel** → user truy cập `https://your-app.vercel.app`.
- **Backend (Express + WebSocket):** **Không** chạy trên Vercel (Vercel serverless không giữ kết nối WebSocket lâu dài). Deploy backend ở nơi khác, ví dụ:
  - **Railway**
  - **Render**
  - **Fly.io**
  - **Railway / Render** thường dễ: push repo, chọn root hoặc thư mục backend, set env (DATABASE_URL, PORT…), có URL kiểu `https://your-api.railway.app`.

Sau khi backend có URL production (vd: `https://real-time-sports-api.railway.app`), frontend cần biết URL này để gọi REST và WebSocket.

---

## 4. API_URL / VITE_API_URL là gì?

| Ngữ cảnh | Biến | Ý nghĩa |
|----------|------|--------|
| **Seed script** (chạy trên máy bạn / CI) | `API_URL` | Base URL của backend để seed gọi `POST /matches`, `POST /matches/:id/commentary`. Production: set `API_URL=https://your-api.railway.app` khi chạy seed trỏ vào backend production. |
| **Frontend (build trên Vercel)** | `VITE_API_URL` | Base URL backend. Vite chỉ expose biến có prefix `VITE_` ra client. Build时 giá trị được inline vào JS. User mở app trên Vercel → browser gọi `fetch(VITE_API_URL + '/matches')` tới backend thật. |

**Kết luận:** Trên Vercel bạn **không** set `API_URL` cho frontend. Bạn set **`VITE_API_URL`** (và tùy chọn **`VITE_WS_URL`**) trong Environment Variables của project Vercel.

---

## 5. Cấu hình Environment Variables trên Vercel

1. Vào [Vercel Dashboard](https://vercel.com/dashboard) → chọn project (frontend).
2. **Settings** → **Environment Variables**.
3. Thêm:

| Name | Value | Ghi chú |
|------|--------|--------|
| `VITE_API_URL` | `https://your-backend.railway.app` | Thay bằng URL backend production thật (không có dấu `/` cuối cũng được). |
| `VITE_WS_URL` | (optional) `wss://your-backend.railway.app/ws` | Nếu không set, frontend sẽ tự suy từ `VITE_API_URL` (đổi `https` → `wss`, thêm `/ws`). Chỉ cần set khi backend WebSocket ở URL khác. |

4. Chọn **Production** (và Preview nếu muốn dùng chung).
5. **Save**.
6. **Redeploy** để build mới có giá trị env (env chỉ áp dụng lúc build).

---

## 6. Frontend đã đọc thế nào?

- **REST:** `frontend/src/api/client.js` — khi không phải dev thì dùng `import.meta.env.VITE_API_URL`. Nếu không set → fallback `''` (gọi same origin, sẽ sai nếu backend không cùng domain).
- **WebSocket:** `frontend/src/api/ws.js` — production: ưu tiên `VITE_WS_URL`, không có thì suy từ `VITE_API_URL` (http → ws, https → wss, thêm `/ws`).

Vì vậy **bắt buộc** set **`VITE_API_URL`** trên Vercel trỏ đúng backend production.

---

## 7. Seed script khi chạy cho production

Seed chạy trên máy bạn (hoặc CI), không chạy trên Vercel. Để seed **vào backend production**:

```bash
API_URL=https://your-backend.railway.app npm run seed
```

Hoặc thêm vào `.env` (trên máy bạn, không commit):

```env
API_URL=https://your-backend.railway.app
```

Sau đó chạy `npm run seed` như bình thường.

---

## 8. Tóm tắt

| Mục đích | Biến | Đặt ở đâu | Ví dụ |
|----------|------|-----------|--------|
| Frontend (Vercel) gọi API production | `VITE_API_URL` | Vercel → Project → Settings → Environment Variables | `https://your-api.railway.app` |
| Frontend (Vercel) kết nối WebSocket production | `VITE_WS_URL` (optional) | Cùng chỗ | `wss://your-api.railway.app/ws` (hoặc bỏ qua để tự suy từ VITE_API_URL) |
| Seed trỏ vào backend production | `API_URL` | Trên máy/CI: `.env` hoặc `API_URL=... npm run seed` | `https://your-api.railway.app` |

**Lưu ý:** Backend (Express + WebSocket) cần deploy trên nền tảng hỗ trợ long-running + WebSocket (Railway, Render, Fly.io…), không dùng Vercel cho phần backend này.

---

## 9. Hướng dẫn deploy từng bước (Vercel + Railway)

Vercel chỉ chạy **frontend**. Backend phải deploy **Railway** (hoặc Render) trước để có URL API.

### Bước 1: Deploy backend lên Railway

1. Đăng nhập [Railway](https://railway.app) (GitHub).
2. **New Project** → **Deploy from GitHub repo** → chọn repo `Real-Time-Sports-Broadcast`.
3. Railway tạo một **Service**. Vào service đó:
   - **Settings** → **Root Directory:** để trống (backend ở root repo).
   - **Settings** → **Build Command:** `npm install` (hoặc để Railway tự detect).
   - **Settings** → **Start Command:** `npm start` (trong `package.json` đã có `"start": "node src/index.js"`).
   - **Variables** → thêm env giống local:
     - `DATABASE_URL` = connection string Neon (giống `.env` local)
     - `PORT` = `8000` (Railway có thể gán PORT tự động, nếu có thì không cần set)
     - `ARCJET_KEY` (nếu dùng Arcjet)
     - `NODE_ENV` = `production` (tùy chọn)
4. **Settings** → **Networking** → **Generate Domain** → Railway sẽ cho URL kiểu `https://xxx.up.railway.app`.
5. Copy URL này (vd: `https://real-time-sports-broadcast-production.up.railway.app`) — đây là **backend production URL**.

### Bước 2: Deploy frontend lên Vercel

1. Đăng nhập [Vercel](https://vercel.com) (GitHub).
2. **Add New** → **Project** → **Import** repo `Real-Time-Sports-Broadcast`.
3. Cấu hình project:
   - **Root Directory:** chọn **Edit** → điền `frontend` (vì code React nằm trong thư mục `frontend/`).
   - **Framework Preset:** Vite (Vercel thường tự detect).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist` (mặc định Vite)
4. **Environment Variables** — thêm **trước khi** Deploy:
   - `VITE_API_URL` = URL backend vừa copy (vd: `https://real-time-sports-broadcast-production.up.railway.app`) — **không** thêm `/` cuối.
   - `VITE_WS_URL` (optional): `wss://real-time-sports-broadcast-production.up.railway.app/ws` — hoặc bỏ qua, frontend sẽ tự suy từ `VITE_API_URL`.
5. Chọn **Production** (và Preview nếu muốn).
6. Bấm **Deploy**. Sau khi xong, bạn có URL frontend kiểu `https://real-time-sports-broadcast.vercel.app`.

### Bước 3: Cho phép frontend gọi backend (CORS)

Backend đã dùng package `cors`. Mặc định cho phép `http://localhost:5173`. **Production:** trên Railway thêm biến môi trường:

- **`CORS_ORIGIN`** = URL frontend Vercel, ví dụ: `https://real-time-sports-broadcast.vercel.app`  
  Nhiều domain thì dùng dấu phẩy: `https://app.vercel.app,https://preview.vercel.app`

Sau khi set, redeploy backend trên Railway để CORS có hiệu lực.

### Bước 4: Seed data lên production (tùy chọn)

Trên máy bạn, chạy seed trỏ vào backend production:

```bash
API_URL=https://real-time-sports-broadcast-production.up.railway.app npm run seed
```

(Thay URL bằng URL Railway thật của bạn.)

---

## 10. Checklist nhanh

- [ ] Backend deploy Railway, có URL public.
- [ ] Backend set env: `DATABASE_URL`, `PORT`, `ARCJET_KEY` (nếu dùng).
- [ ] Backend bật CORS cho domain Vercel (và localhost khi dev).
- [ ] Frontend deploy Vercel, Root Directory = `frontend`.
- [ ] Vercel set `VITE_API_URL` = URL backend (và `VITE_WS_URL` nếu cần).
- [ ] Redeploy frontend sau khi thêm/sửa env.
- [ ] (Tùy chọn) Chạy seed với `API_URL=...` để có data trên production.
