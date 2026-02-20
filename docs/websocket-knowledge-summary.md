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

## 6. Data Transfer (Truyền Dữ Liệu)

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

## 7. Back Pressure (Áp Lực Ngược)

### Vấn đề
- Server gửi updates quá nhanh
- User có kết nối internet chậm
- Messages bắt đầu tích tụ trong memory → **Back pressure**

### Giải pháp
- Production apps **monitor** lượng data đang được buffer
- Nếu buffer quá cao → **giảm tốc độ gửi** để server không bị quá tải
- Đây là concept nâng cao, quan trọng cho hệ thống production lớn

## 8. Tóm Tắt Kiến Trúc WebSocket

### Quy trình hoàn chỉnh:
1. ✅ **Connect**: Tạo WebSocket connection
2. ✅ **Upgrade**: HTTP → WebSocket (101 Switching Protocols)
3. ✅ **State**: Server giữ reference trong memory
4. ✅ **Heartbeat**: Ping-pong để detect ghost connections
5. ✅ **Send Messages**: Text/JSON hoặc Binary
6. ✅ **Back Pressure**: Monitor và điều chỉnh tốc độ gửi

## 9. So Sánh Nhanh

| Đặc điểm | HTTP Polling | WebSocket |
|----------|--------------|-----------|
| Connection | Tạm thời (mở/đóng) | Persistent (mở liên tục) |
| Overhead | HTTP headers mỗi request | Chỉ message payload |
| Real-time | Có độ trễ | Ngay lập tức |
| Server load | Cao (nhiều requests) | Thấp (giữ connections) |
| Mobile battery | Tốn pin | Tiết kiệm pin |
| State | Stateless | Stateful |

---

## Tài Liệu Tham Khảo

Tài liệu này được tổng hợp từ bài giảng về WebSocket architecture và best practices.
