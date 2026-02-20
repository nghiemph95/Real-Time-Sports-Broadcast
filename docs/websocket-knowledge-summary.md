# Tổng Hợp Kiến Thức Về WebSocket

## 1. Vấn Đề Với HTTP Polling

### Tại sao HTTP không phù hợp cho ứng dụng real-time?
- **HTTP là request-response protocol**: Client phải liên tục hỏi server để biết có dữ liệu mới không
- **Không hiệu quả**: Mỗi lần polling gửi toàn bộ HTTP headers (kích thước lớn)
- **Độ trễ cao**: Phải đợi đến lượt polling tiếp theo mới nhận được update
- **Tốn tài nguyên**: Server phải xử lý hàng nghìn HTTP requests mở/đóng liên tục
- **Ảnh hưởng pin mobile**: Polling đánh thức điện thoại liên tục

## 2. WebSocket Là Gì?

### Định nghĩa
- **WebSocket** là một protocol hỗ trợ kết nối **persistent two-way** (hai chiều liên tục)
- Kết nối **mở liên tục** cho phép cả client và server gửi message bất cứ lúc nào
- Được gọi là **Full Duplex**: Cả hai phía có thể nói cùng lúc

### Ưu điểm của WebSocket
- ✅ **Real-time**: Server có thể push updates ngay lập tức
- ✅ **Hiệu quả hơn polling**: 
  - Một khi connection mở, messages rất nhỏ (không có HTTP headers)
  - Server chỉ cần giữ connection mở thay vì xử lý hàng nghìn requests
- ✅ **Tốt cho mobile**: Một connection mở tốt hơn cho pin so với polling liên tục
- ✅ **Chi phí thấp hơn**: Ít overhead hơn so với HTTP requests

### Use Cases
- Typing indicators (chỉ báo đang gõ)
- Live comments (bình luận trực tiếp)
- Multiplayer game movement
- Notifications (thông báo)
- Chat applications (ứng dụng chat)

## 3. WebSocket Handshake

### Quá trình nâng cấp từ HTTP sang WebSocket

```
1. Client gửi HTTP GET request với header đặc biệt:
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: [key]

2. Server phản hồi:
   HTTP 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: [accept key]

3. Từ đây, HTTP kết thúc và WebSocket tunnel được mở
```

### Đặc điểm
- Bắt đầu như một **HTTP request bình thường**
- Browser thêm header đặc biệt để yêu cầu upgrade
- Server phản hồi **HTTP 101** để chấp nhận upgrade
- Sau đó, connection trở thành **WebSocket tunnel**: mở, persistent, và real-time

## 4. WS vs WSS

### Hai loại WebSocket
- **WS**: Unencrypted (không mã hóa) - chỉ dùng cho development
- **WSS**: Encrypted (mã hóa) - **luôn dùng trong production**

> ⚠️ **Lưu ý**: Trong production, luôn sử dụng WSS để bảo mật dữ liệu

## 5. Lifecycle Của WebSocket Connection

### Các giai đoạn của kết nối WebSocket

#### 1. **Connect (Kết nối)**
```javascript
const socket = new WebSocket('ws://localhost:8080');
```
- Browser gửi HTTP GET request với header upgrade
- Server phản hồi 101 Switching Protocols
- Connection được nâng cấp thành WebSocket tunnel

#### 2. **State/Memory (Trạng thái/Bộ nhớ)**
- **HTTP**: Stateless - server quên bạn sau mỗi request
- **WebSocket**: **Stateful** - server giữ reference đến socket trong memory
- Điều này cho phép server push data ngay lập tức

#### 3. **Ghost Connections (Kết nối ma)**
**Vấn đề:**
- Client mất Wi-Fi, điện thoại tắt, đóng laptop mà không disconnect đúng cách
- Server vẫn nghĩ connection còn sống và giữ socket trong memory
- Nếu không dọn dẹp, server sẽ chết dần vì memory leak

**Giải pháp: Heartbeat (Ping-Pong)**
- Server gửi **ping** định kỳ (ví dụ mỗi 30 giây)
- Client phải phản hồi **pong**
- Nếu server không nhận được pong → giả định client đã chết → terminate socket

**So sánh với Polling:**
- Polling: Toàn bộ HTTP request (nặng)
- WebSocket ping: Chỉ là một impulse nhỏ trên tunnel đã mở (nhẹ hơn rất nhiều)

## 6. WebSocket Là State Machine (Máy Trạng Thái)

WebSocket về bản chất là một **state machine**. Gửi data sai state → dễ gây bug, message lỗi, hoặc crash. Cần nắm **4 trạng thái**:

| State | Giá trị `readyState` | Ý nghĩa | Hành động |
|-------|----------------------|---------|-----------|
| **CONNECTING** | `0` | Handshake đang diễn ra | **Chưa gửi** — đợi |
| **OPEN** | `1` | Tunnel đã sống | **Safe zone** — có thể gửi |
| **CLOSING** | `2` | Connection đang tắt | **Dừng gửi** — không push thêm data |
| **CLOSED** | `3` | Connection đã chết | **Reconnect** — tạo kết nối mới |

### Kiểm tra trạng thái
```javascript
// Client hoặc server đều dùng
socket.readyState  // 0 | 1 | 2 | 3
```

Luôn kiểm tra `socket.readyState === 1` (OPEN) trước khi gửi nếu cần an toàn.

## 7. Server-Side Events (Thư Viện `ws`)

Trên **server** bạn là host: lắng nghe client join, gửi data, disconnect, crash. Entry point là **connection**.

| Event | Khi nào xảy ra | Cách dùng |
|-------|----------------|-----------|
| **connection** | Client mới kết nối | `wss.on('connection', (ws, req) => { ... })` — xử lý client join |
| **message** | Có data gửi từ client | `ws.on('message', (data) => { ... })` — data thường là **Buffer**, cần convert (e.g. `data.toString()`) |
| **error** | Lỗi trên socket | **Rất quan trọng.** Không handle → 1 connection lỗi có thể crash cả Node process. Luôn `ws.on('error', ...)` và xử lý graceful |
| **close** | Client ngắt kết nối | `ws.on('close', () => { ... })` — dọn dẹp, remove khỏi danh sách clients |

### Ví dụ server (ws)
```javascript
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  // Client mới join
  ws.on('message', (data) => {
    // data thường là Buffer → data.toString() hoặc JSON.parse(data.toString())
  });
  ws.on('error', (err) => {
    // Bắt buộc: xử lý lỗi để không crash process
  });
  ws.on('close', () => {
    // Client đã thoát
  });
});
```

## 8. Client-Side Events (Browser)

Trên **client** bạn là participant: lắng nghe open, message từ server, và close.

| Event | Khi nào xảy ra | Cách dùng |
|-------|----------------|-----------|
| **open** | Handshake thành công, tunnel sống | Lúc này **an toàn để gửi**. Có thể `send()` hoặc gửi message chào server |
| **message** | Server gửi data xuống | Parse data (JSON, text) và cập nhật UI / logic |
| **error** | Lỗi kết nối | Handle để hiển thị thông báo hoặc reconnect |
| **close** | Đã ngắt kết nối | Server là boss; khi close nghĩa là disconnected — có thể hiển thị "Đã ngắt" hoặc thử reconnect |

### Ví dụ client (Browser)
```javascript
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
  // An toàn để gửi
  socket.send(JSON.stringify({ type: 'hello' }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Cập nhật UI, hiển thị message, v.v.
};

socket.onerror = (err) => { /* xử lý lỗi */ };
socket.onclose = () => { /* đã ngắt, có thể reconnect */ };
```

## 9. Cheat Sheet: Methods & Listeners

### Server (thư viện `ws`)
- **Tạo server**: `new WebSocketServer({ port })` hoặc attach vào HTTP server
- **Listeners**: `connection` → trong callback: `message`, `error`, `close`
- **Gửi**: `ws.send(data)` (khi `ws.readyState === 1`)

### Client (Browser API)
- **Tạo**: `new WebSocket(url)`
- **Listeners**: `onopen`, `onmessage`, `onerror`, `onclose`
- **Gửi**: `socket.send(data)` (khi `socket.readyState === 1`)

| Phía | Tạo / Entry | Listeners chính |
|------|-------------|-----------------|
| **Server** | `connection` | `message`, `error`, `close` |
| **Client** | `new WebSocket(url)` | `open`, `message`, `error`, `close` |

## 10. Data Transfer (Truyền Dữ Liệu)

### Hai loại message chính

#### 1. **Text/JSON** (Phổ biến nhất)
```javascript
socket.send(JSON.stringify({
  type: 'typing',
  userId: 42,
  message: 'user is typing'
}));
```
- **Use cases**: Typing indicators, messages, notifications, score updates
- **Ưu điểm**: 
  - Human-readable (dễ đọc)
  - Dễ debug
  - Phù hợp cho 99% ứng dụng

#### 2. **Binary** (Cho dữ liệu lớn/serious)
```javascript
socket.send(arrayBuffer); // hoặc Blob
```
- **Use cases**: 
  - Audio streaming
  - Video frames
  - Multiplayer game states
  - Large payloads
- **Ưu điểm**: 
  - Nhanh hơn
  - Nhỏ hơn
  - Hiệu quả hơn

### Opcodes
- Ở mức thấp nhất, WebSocket sử dụng **opcodes** để đánh dấu loại frame:
  - Text frame
  - Binary frame
  - Closing frame
  - Ping/Pong frame
- Thường không cần làm việc trực tiếp với opcodes, nhưng đây là cách protocol hoạt động

## 11. Back Pressure (Áp Lực Ngược)

### Vấn đề
- Server gửi updates quá nhanh
- User có kết nối internet chậm
- Messages bắt đầu tích tụ trong memory → **Back pressure**

### Giải pháp
- Production apps **monitor** lượng data đang được buffer
- Nếu buffer quá cao → **giảm tốc độ gửi** để server không bị quá tải
- Đây là concept nâng cao, quan trọng cho hệ thống production lớn

## 12. Tóm Tắt Kiến Trúc WebSocket

### Quy trình hoàn chỉnh:
1. ✅ **Connect**: Tạo WebSocket connection
2. ✅ **Upgrade**: HTTP → WebSocket (101 Switching Protocols)
3. ✅ **State machine**: Chỉ gửi khi `readyState === OPEN` (1)
4. ✅ **State**: Server giữ reference trong memory
5. ✅ **Events**: Server — connection, message, error, close; Client — open, message, error, close
6. ✅ **Heartbeat**: Ping-pong để detect ghost connections
7. ✅ **Send Messages**: Text/JSON hoặc Binary
8. ✅ **Back Pressure**: Monitor và điều chỉnh tốc độ gửi

## 13. So Sánh Nhanh

| Đặc điểm | HTTP Polling | WebSocket |
|----------|--------------|-----------|
| Connection | Tạm thời (mở/đóng) | Persistent (mở liên tục) |
| Overhead | HTTP headers mỗi request | Chỉ message payload |
| Real-time | Có độ trễ | Ngay lập tức |
| Server load | Cao (nhiều requests) | Thấp (giữ connections) |
| Mobile battery | Tốn pin | Tiết kiệm pin |
| State | Stateless | Stateful |

---

# Phần 2: Thiết Kế Message Flow & Ecosystem

## 14. Vì Sao Cần Cấu Trúc Message? — Envelope Pattern

### Vấn đề khi gửi "blind packet"
- Khi bạn chỉ gọi `socket.send(data)`, server nhận được **một gói dữ liệu không ngữ cảnh**
- Server không biết: đây là tin nhắn chat, typing event, lệnh, hay request xóa?
- Trong production, **gửi data là phần dễ**; **thiết kế luồng message** mới là kỹ năng quan trọng

### Giải pháp: Envelope Pattern (Mẫu phong bì)
Giống như gửi bưu kiện: bạn không ném đồ vào thùng mail mà **dán nhãn** (type, id, payload).

**Ví dụ envelope chuẩn:**
```javascript
{
  type: 'chat_message',      // Server biết chạy logic gì
  id: 'msg-uuid-123',       // Theo dõi / dedup / ack
  metadata: { timestamp: 1234567890, userId: 42 },  // Ngữ cảnh tùy chọn
  payload: {
    text: 'Hello world',
    roomId: 'room-abc'
  }
}
```

| Thành phần | Vai trò |
|------------|--------|
| **type** | Cho server biết **logic nào** chạy (chat, typing, join_room, delete, …) |
| **id** | Theo dõi message, trùng lặp, hoặc acknowledgement |
| **metadata** | Ngữ cảnh bổ sung (timestamp, userId, …) |
| **payload** | **Dữ liệu thật** của message |

Server đóng vai **switchboard**: chỉ cần đọc một trường `type` rồi route đúng handler (ví dụ `switch (msg.type)` trong JavaScript).

---

## 15. Hai Cách Cấu Trúc Envelope

### 1. Type-based commands (Lệnh theo loại) — Khuyến nghị
- **Dùng khi:** Ứng dụng có **danh sách hành động cố định**: chat message, typing, user_join, leave_room, …
- **Ví dụ type:** `chat_message`, `typing`, `user_join`, `delete_message`
- **Phù hợp:** Chat app, dashboard, công cụ cộng tác

### 2. Topic-based (Pub/Sub style)
- **Dùng khi:** **Kênh động** — client subscribe theo chủ đề thay đổi
- **Ví dụ:** topic `stock:AAPL` + data giá; topic `game:Lakers vs Warriors` + score
- **Phù hợp:** Cảm biến, ticker chứng khoán, thị trường live, sport engines

Có thể kết hợp: type cho “hành động” (subscribe, unsubscribe), topic cho “kênh dữ liệu”.

---

## 16. Định Dạng: JSON vs Binary

| Tiêu chí | JSON | Binary |
|----------|------|--------|
| **Đọc được** | Có, dễ debug | Không, raw bytes |
| **Bandwidth** | Nặng hơn (text) | Nhẹ hơn |
| **Độ trễ** | Cao hơn một chút | Thấp hơn |
| **Dùng cho** | Control: join, auth, lệnh, chat, notification | High-frequency: GPS, chuột, audio chunk, game state |

**Thực tế:** Nhiều app **dùng cả hai** — JSON cho control (join, auth, commands), Binary cho luồng dữ liệu tốc độ cao.

---

## 17. Message Routing: Broadcast, Unicast, Multicast

Production không “hét” một message cho **mọi** client. Cần **routing** đúng đối tượng.

### 1. Broadcast (một-gửi-tất cả)
- **Một** message → **mọi** client đang kết nối
- Giống **megaphone**: thông báo hệ thống, global alert, service status
- **Lưu ý:** 10.000 user = 10.000 lần gửi — dùng **thỉnh thoảng**, không phải mỗi 100ms

### 2. Unicast (một-một)
- **Một** message → **một** client (DM, notification riêng)
- **Cách làm:** Giữ **registry** map `userId` (hoặc sessionId) → `socket`. Tra cứu O(1), không loop toàn bộ client
- **Dùng cho:** Tin nhắn riêng, thông báo cho user, hành động admin

### 3. Multicast (một-nhiều theo nhóm)
- **Một** message → **một nhóm** (room, channel)
- **Room** là ranh giới: “mọi người nghe mọi thứ” vs “chỉ đúng người nghe đúng thứ”
- **Dùng cho:** Kênh Discord, game lobby, live event chat, document cộng tác

**Tóm tắt:**

| Pattern | Mô tả | Ví dụ |
|---------|--------|--------|
| **Broadcast** | 1 → tất cả | System announcement |
| **Unicast** | 1 → 1 | DM, notification, admin |
| **Multicast** | 1 → nhóm (room) | Channel, lobby, phòng chat |

---

## 18. Acknowledgements (Ack) — Thêm Độ Tin Cậy

- WebSocket **nhanh** nhưng mặc định là **fire-and-forget**: không có “200 OK” như HTTP
- Với **hành động quan trọng** (gửi tin nhắn, xóa, cập nhật): thêm **ack**

**Cách làm:**
1. Client gửi message kèm **id** (ví dụ `messageId`)
2. Server xử lý xong, gửi lại **receipt** với **cùng id**
3. Client đợi receipt trong thời gian timeout; không nhận được → **retry**

Nhờ vậy bạn thêm một lớp **reliability** trên nền WebSocket.

---

## 19. Pub/Sub Pattern & Scale Với Redis

### Pub/Sub là gì?
- Client **subscribe** theo thứ mình quan tâm (như đặt mua báo)
- Ví dụ: User A, C subscribe Apple stock; B subscribe Google → khi Apple cập nhật, chỉ A và C nhận

### Thách thức khi nhiều server
- **Nhiều server** → mỗi server chỉ biết **client kết nối với chính nó**
- Server 1 publish update → Server 2 **không biết** → client ở Server 2 không nhận

### Giải pháp: Message broker (Redis)
- **Redis** (hoặc broker tương tự) làm **lớp broadcast trung tâm** giữa tất cả server
- Server publish vào Redis; server nào subscribe topic đó thì nhận và gửi xuống client của mình
- Cách này giúp **scale** lên hàng triệu kết nối

---

## 20. Khi Nào Dùng WebSocket? So Với WebRTC, WebTransport, SSE

WebSocket mạnh nhưng **không phải silver bullet**. Ví dụ: đẩy video 4K qua WebSocket → server tốn tài nguyên và dễ lag.

### Bản đồ real-time

| Công nghệ | Dùng cho | Ghi chú |
|-----------|----------|--------|
| **WebSocket** | Chat, collaboration, dashboard, real-time app phổ thông | Ổn định, hỗ trợ rộng, đã battle-tested |
| **WebRTC** | Voice, video, P2P, file transfer | Hai browser **nói trực tiếp** (P2P), độ trễ rất thấp. Cần **signaling** (thường làm bằng WebSocket) để matchmaking |
| **WebTransport** | Ultra-low latency streaming, cloud gaming, media pipeline | Dùng HTTP/3 (QUIC), nhiều stream độc lập → tránh head-of-line blocking của TCP |
| **SSE (Server-Sent Events)** | Cập nhật **một chiều** từ server → client | Stock ticker, feed, streaming data; đơn giản, tự reconnect |

### WebRTC ngắn gọn
- **Client–Server–Client** (qua WebSocket) phù hợp chat, notification, dashboard
- **Heavy media** (voice/video) đi qua server thì đắt và chậm
- **WebRTC:** hai browser kết nối **trực tiếp** (P2P), độ trễ rất thấp
- **Signaling:** hai bên cần “tìm nhau” và trao đổi thông tin kết nối — bước này thường dùng **WebSocket**
- **Luồng điển hình:** Client A/B kết nối WebSocket server → A gửi offer, B gửi answer → sau khi trao đổi thông tin mạng, WebRTC nối trực tiếp A–B; server không chuyển media

### WebTransport ngắn gọn
- WebSocket dựa trên **TCP**: một packet mất → **head-of-line blocking** (cả luồng dừng chờ retransmit)
- **WebTransport** dùng HTTP/3 (QUIC): **nhiều stream độc lập** trên một connection → một stream bị trễ không chặn stream khác → ít freeze, real-time mượt hơn
- Chỉ cần khi build hệ thống **cực kỳ nhạy latency**; còn lại WebSocket vẫn là lựa chọn chính

### Quy tắc chọn nhanh
1. **Server cần đẩy update xuống client?** → SSE hoặc WebSocket  
2. **Client cần “nói lại” server?** → WebSocket (SSE chỉ một chiều)  
3. **Dữ liệu nặng: audio, video, khối lượng lớn?** → WebRTC (P2P) hoặc streaming chuyên biệt, không đẩy qua WebSocket

---

## 21. Cheat Sheet: Khi Nào Dùng Gì

| Nhu cầu | Công nghệ |
|---------|-----------|
| Real-time app thông thường (chat, collaboration, dashboard) | **WebSocket** |
| Voice, video, P2P, truyền file trực tiếp | **WebRTC** (signaling bằng WebSocket) |
| Ultra-low latency, nhiều stream, ít head-of-line blocking | **WebTransport** |
| Cập nhật một chiều (ticker, feed, stream) | **SSE** |

---

## 22. Tổng Kết Hành Trình

1. **HTTP polling** tốn tài nguyên → **WebSocket** tạo tunnel persistent, full duplex qua handshake.
2. **Kiến trúc:** lifecycle, heartbeat ping-pong, ghost connections, opcodes.
3. **Thực hành:** WebSocket server với thư viện `ws`, test với WSCAT/browser, broadcast cơ bản.
4. **Thiết kế message:** envelope pattern, type/topic, JSON vs binary, **broadcast / unicast / multicast**, **ack** để tin cậy.
5. **Ecosystem:** WebSocket cho phần lớn real-time; WebRTC cho P2P media; WebTransport cho ultra-low latency; SSE cho one-way feed.

---

## Tài Liệu Tham Khảo

Tài liệu này được tổng hợp từ bài giảng về WebSocket architecture và best practices.
