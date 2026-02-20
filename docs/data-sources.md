# Nguồn dữ liệu: API bên thứ ba vs Seed / data giả

Tài liệu trả lời: (1) Làm sao biết và dùng API bên thứ ba để lấy kết quả trận đấu thật? (2) Có thể chỉ dùng seed và tự tạo data giả như đã setup không?

---

## 1. Chỉ dùng seed + data giả — Được, và đã sẵn sàng (đang dùng)

**Có.** Dự án **đã cấu hình theo cách này**: không cần API bên thứ ba.

- **Data tĩnh:** `src/data/data.js` — export default `{ matches, commentary }` (danh sách trận + commentary mẫu).
- **Seed script:** `npm run seed` — đọc từ `data.js`, gọi REST API của chính bạn (`POST /matches`, `POST /matches/:id/commentary`) để đẩy data vào DB và kích hoạt WebSocket (match_created, commentary).
- **Luồng:** Chạy backend (`npm run dev`) → chạy seed (`npm run seed`) → mở dashboard; data hiển thị qua REST + real-time qua WebSocket.

**Khi nào phù hợp:** Demo, MVP, testing, khi chưa cần dữ liệu trận thật. Không cần đăng ký API ngoài, không tốn tiền.

**Mở rộng data giả (tùy chọn):**

- Thêm/sửa object trong `src/data/data.js` (matches, commentary) rồi chạy lại seed.
- Viết script rule-based: random team, cầu thủ, phút, event (goal, thẻ, …) → gọi `POST /matches/:id/commentary` định kỳ để giả lập commentary “live”.

---

## 2. Muốn dùng API bên thứ ba (kết quả trận thật)

### Làm sao “biết” được API?

- **Tìm trên web:** search "football API", "soccer live score API", "sports API free".
- **Một số nguồn phổ biến:**

| Nguồn | URL | Cách lấy key / doc |
|-------|-----|---------------------|
| **API-Football** | https://www.api-football.com | Đăng ký tài khoản → Dashboard → API Key. Doc: https://www.api-football.com/documentation-v3 |
| **API-Sports** | https://www.api-sports.io | Đăng ký → Subscription → API Key. Doc: https://api-sports.io/documentation |
| **OpenLigaDB** | https://www.openligadb.de | Free, không cần key. Doc/endpoint: https://www.openligadb.de (Bundesliga). |

- **Biết API có gì:** Đọc **Documentation** của từng dịch vụ (endpoints: fixtures, live, events, standings…) và xem response JSON (id trận, đội, tỉ số, phút, loại event…).

### Cách dùng trong project (không gọi từ browser)

1. **Lấy key** (nếu API yêu cầu) và **đọc doc** (endpoint, query params, format response).
2. **Chạy ở backend:** Tạo script hoặc cron (Node) gọi API (vd: `fetch(https://api.api-football.com/...)` với header `x-apisports-key: YOUR_KEY`).
3. **Map response → DB/API của bạn:**
   - Fixtures/live → map sang schema match (homeTeam, awayTeam, startTime, endTime, homeScore, awayScore, status) → `POST /matches` hoặc insert DB.
   - Events (goal, card, substitution…) → map sang commentary (minute, message, eventType, actor, team) → `POST /matches/:id/commentary` hoặc insert DB rồi gọi `broadcastCommentary`.
4. **Không** gọi API bên thứ ba từ frontend (CORS, lộ key). Mọi thứ qua backend.

### Ví dụ luồng (API-Football)

- Endpoint fixtures: `GET https://v3.football.api-sports.io/fixtures?league=39&season=2024`.
- Backend script: fetch → parse → với mỗi fixture, map thành một object match → `POST ${API_URL}/matches` (API_URL là backend của bạn).
- Endpoint events: `GET https://v3.football.api-sports.io/fixtures/events?fixture=ID` → map từng event thành commentary → `POST ${API_URL}/matches/:id/commentary` (id là id trận trong DB của bạn, cần map fixture id → match id nội bộ).

---

## 3. So sánh nhanh

| Cách | Ưu điểm | Nhược điểm |
|------|---------|------------|
| **Seed + data giả** | Đã có sẵn, không phụ thuộc bên ngoài, free, dễ chỉnh. | Data không phải trận thật. |
| **API bên thứ ba** | Kết quả trận thật, cập nhật theo giải. | Cần đăng ký (và có thể tốn phí), rate limit, phải viết sync/map. |

**Khuyến nghị:** Bắt đầu với **seed + data giả** như đã setup. Khi cần trận thật, chọn một API (vd: API-Football hoặc API-Sports), đọc doc, viết script sync trên backend và map vào REST/DB + WebSocket như trên.

Tài liệu chi tiết hơn về envelope, routing, Phase 1/2/3: **docs/dashboard-development-plan.md** (mục 2).
