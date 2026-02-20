# Luồng WebSocket — Real-Time Sports Broadcast

Tài liệu mô tả luồng WebSocket của dự án: kết nối, subscribe/unsubscribe theo trận, broadcast vs multicast, heartbeat và tích hợp với REST API.

---

## 1. Tổng quan

- **Path:** `ws://<host>:<port>/ws` (cùng HTTP server, upgrade trên path `/ws`).
- **Vai trò:** Push real-time khi có trận mới (broadcast) và khi có commentary/score theo từng trận (multicast).
- **File chính:** `src/ws/server.js` — `attachWebSocketServer(server)` gắn vào HTTP server, trả về `broadcastMatchCreated`, `broadcastCommentary` để REST route gọi.

```text
Client  <--WebSocket-->  Server (ws/server.js)
                              ^
                              | app.locals.broadcastMatchCreated / broadcastCommentary
                              |
REST (POST /matches, POST /matches/:id/commentary)  -->  Route gọi broadcast
```

---

## 2. Luồng kết nối (Connection & Upgrade)

```mermaid
sequenceDiagram
  participant Client
  participant HTTP as HTTP Server
  participant Arcjet
  participant WSS as WebSocketServer

  Client->>HTTP: GET /ws (Upgrade: websocket)
  HTTP->>HTTP: pathname === "/ws" ?
  alt path !== /ws
    HTTP-->>Client: (không upgrade)
  end
  opt Có Arcjet
    HTTP->>Arcjet: protect(req)
    Arcjet-->>HTTP: decision
    alt Denied (rate limit / forbidden)
      HTTP->>Client: 429 hoặc 403 + destroy socket
    end
  end
  HTTP->>WSS: handleUpgrade(req, socket, head, cb)
  WSS->>Client: HTTP 101 Switching Protocols
  WSS->>WSS: emit("connection", ws, req)
  Note over WSS: socket.isAlive = true, subscriptions = Set(), welcome
```

- Chỉ upgrade khi **pathname === "/ws"**.
- Nếu bật **Arcjet:** kiểm tra trước khi upgrade; từ chối thì trả 429 (rate limit) hoặc 403 và `socket.destroy()`.
- Sau upgrade: **connection** → khởi tạo `socket.subscriptions` (Set), gửi **welcome**, đăng ký message/error/close.

---

## 3. Envelope (Định dạng message)

Mọi message đều là JSON với ít nhất **type** (và **data** khi có payload). Client và server đều dùng chung pattern.

### Server → Client

| type | Ý nghĩa | Khi nào |
|------|--------|---------|
| `welcome` | Kết nối thành công | Ngay sau khi connection (handshake xong). |
| `subscribed` | Đã subscribe một trận | Phản hồi sau khi xử lý `subscribe` (kèm `matchId`). |
| `unsubscribed` | Đã unsubscribe | Phản hồi sau khi xử lý `unsubscribe` (kèm `matchId`). |
| `match_created` | Có trận mới | Broadcast khi REST **POST /matches** tạo trận (payload: `data` = match). |
| `commentary` | Bình luận mới của trận | Multicast khi REST **POST /matches/:id/commentary** tạo commentary (payload: `data` = comment). |
| `error` | Lỗi (vd: invalid JSON) | Khi parse body client gửi lỗi hoặc logic báo lỗi (kèm `message`). |

### Client → Server

| type | Payload | Ý nghĩa |
|------|---------|---------|
| `subscribe` | `matchId` (number) | Đăng ký nhận event của trận `matchId` (commentary, sau này có thể thêm score). |
| `unsubscribe` | `matchId` (number) | Hủy đăng ký trận `matchId`. |

Ví dụ client gửi:

```json
{ "type": "subscribe", "matchId": 42 }
```

Server phản hồi:

```json
{ "type": "subscribed", "matchId": 42 }
```

---

## 4. Subscription (Room / Multicast)

- **Registry:** `matchSubscribers = Map<matchId, Set<WebSocket>>`.
- **Subscribe:** Client gửi `{ type: "subscribe", matchId }` → server thêm socket vào `matchSubscribers.get(matchId)` (tạo Set nếu chưa có) và lưu `matchId` vào `socket.subscriptions`.
- **Unsubscribe:** Client gửi `{ type: "unsubscribe", matchId }` → server xóa socket khỏi Set; nếu Set rỗng thì xóa key `matchId` khỏi Map.
- **Cleanup:** Khi socket **close**, server gọi `cleanupSubscriptions(socket)` (duyệt `socket.subscriptions` và unsubscribe từng matchId) để tránh ghost connections và giữ registry đúng.

Chỉ client nằm trong `matchSubscribers.get(matchId)` mới nhận event **commentary** (và sau này có thể thêm score) của trận đó — đây là **multicast** (one-to-many theo room).

---

## 5. Broadcast vs Multicast

| Loại | Hàm | Event | Đối tượng nhận |
|------|-----|--------|----------------|
| **Broadcast** | `broadcastToAll` | `match_created` | Mọi client đang kết nối (readyState === OPEN). |
| **Multicast** | `broadcastToMatch(matchId, …)` | `commentary` | Chỉ client đã subscribe `matchId`. |

- **Match created:** Mọi client đều nhận (danh sách trận / thông báo có trận mới).
- **Commentary:** Chỉ client đang “xem” trận đó (đã gửi `subscribe` với `matchId` tương ứng).

---

## 6. Heartbeat (Ping / Pong)

- Mỗi socket có `isAlive` (ban đầu `true`).
- Khi nhận **pong**, server set `socket.isAlive = true`.
- Mỗi **30 giây** server duyệt tất cả client: set `isAlive = false`, gửi **ping**. Lần sau (30s sau), nếu `isAlive` vẫn `false` (không nhận được pong) thì **terminate** socket.
- Mục đích: phát hiện connection chết (mất mạng, đóng tab không gửi close) để không giữ socket và không gửi message vào socket đã chết — tránh ghost connections.

---

## 7. Luồng Subscribe (Client đăng ký nhận commentary)

```mermaid
sequenceDiagram
  participant Client
  participant Server as WS Server
  participant Registry as matchSubscribers

  Client->>Server: { type: "subscribe", matchId: 42 }
  Server->>Server: JSON.parse, validate matchId
  Server->>Registry: subscribe(42, socket)
  Note over Registry: matchSubscribers.get(42).add(socket)
  Server->>Server: socket.subscriptions.add(42)
  Server->>Client: { type: "subscribed", matchId: 42 }
```

Sau đó mọi event **commentary** của matchId 42 chỉ gửi cho các socket trong `matchSubscribers.get(42)`.

---

## 8. Luồng REST → WebSocket (Match created)

```mermaid
sequenceDiagram
  participant API as REST Client
  participant Route as POST /matches
  participant DB as Database
  participant WS as broadcastMatchCreated
  participant Clients as All WS clients

  API->>Route: POST /matches { sport, homeTeam, ... }
  Route->>DB: insert match
  DB-->>Route: match
  Route->>WS: broadcastMatchCreated(match)
  WS->>Clients: { type: "match_created", data: match }
  Route->>API: 201 { data: match }
```

- REST tạo trận xong gọi `app.locals.broadcastMatchCreated(match)`.
- WebSocket server broadcast `{ type: "match_created", data: match }` tới **mọi** client đang mở.

---

## 9. Luồng REST → WebSocket (Commentary)

```mermaid
sequenceDiagram
  participant API as REST Client
  participant Route as POST /matches/:id/commentary
  participant DB as Database
  participant WS as broadcastCommentary
  participant Registry as matchSubscribers
  participant Subscribers as Clients subscribe matchId

  API->>Route: POST /matches/42/commentary { minute, message, ... }
  Route->>DB: insert commentary (matchId=42)
  DB-->>Route: comment
  Route->>WS: broadcastCommentary(42, comment)
  WS->>Registry: broadcastToMatch(42, { type: "commentary", data: comment })
  Registry->>Subscribers: send (chỉ Set(42))
  Route->>API: 201 { data: comment }
```

- REST tạo commentary xong gọi `app.locals.broadcastCommentary(matchId, comment)`.
- WebSocket server chỉ gửi `{ type: "commentary", data: comment }` cho client nằm trong `matchSubscribers.get(matchId)` (multicast).

---

## 10. Luồng đóng kết nối (Close & Cleanup)

```mermaid
sequenceDiagram
  participant Client
  participant Server as WS Server
  participant Registry as matchSubscribers

  Client->>Server: (disconnect / close)
  Server->>Server: on("close")
  Server->>Server: cleanupSubscriptions(socket)
  loop Mỗi matchId trong socket.subscriptions
    Server->>Registry: unsubscribe(matchId, socket)
    Registry->>Registry: Set.delete(socket), nếu Set rỗng thì Map.delete(matchId)
  end
```

- Mỗi khi socket **close**, server dọn toàn bộ subscription của socket đó để registry không còn reference tới socket đã đóng.

---

## 11. Tóm tắt nhanh

| Bước | Mô tả |
|------|--------|
| 1 | Client kết nối `ws://host/ws` → upgrade, optional Arcjet → connection. |
| 2 | Server gửi `welcome`; client có thể gửi `subscribe` / `unsubscribe` (envelope có `type` + `matchId`). |
| 3 | Server duy trì `matchSubscribers` (Map matchId → Set socket) và `socket.subscriptions` (Set matchId). |
| 4 | **Match created:** REST POST /matches → `broadcastMatchCreated` → broadcast toàn bộ client. |
| 5 | **Commentary:** REST POST /matches/:id/commentary → `broadcastCommentary` → multicast tới client subscribe matchId. |
| 6 | Heartbeat 30s (ping/pong), không pong thì terminate. |
| 7 | Socket close → cleanupSubscriptions → unsubscribe hết khỏi registry. |

Tài liệu lý thuyết WebSocket (state machine, envelope, broadcast/multicast, heartbeat): **docs/websocket-knowledge-summary.md**.  
Luồng REST API (matches, commentary): **docs/rest-api-matches-commentary.md**.
