import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Registry multicast: map matchId -> Set<WebSocket>
 * Dùng cho pattern "one-to-many" (multicast): chỉ gửi message đến client đã subscribe
 * từng trận cụ thể (room/channel), thay vì broadcast toàn bộ.
 * @see docs/websocket-knowledge-summary.md — Message Routing: Multicast
 */
const matchSubscribers = new Map();

/**
 * Đăng ký socket vào room của một trận (matchId).
 * - Nếu matchId chưa có trong registry thì tạo Set mới.
 * - Thêm socket vào Set tương ứng.
 * Dùng khi client gửi message type "subscribe" với matchId — sau đó chỉ client trong
 * Set này mới nhận event commentary/score của trận đó (multicast).
 */
function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

/**
 * Hủy đăng ký socket khỏi room của matchId.
 * - Xóa socket khỏi Set tương ứng.
 * - Nếu Set trống thì xóa luôn key matchId khỏi Map để tránh memory leak (ghost connections).
 * @see docs/websocket-knowledge-summary.md — Ghost Connections, cleanup
 */
function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

/**
 * Dọn dẹp toàn bộ subscription của một socket khi nó đóng (close).
 * Duyệt socket.subscriptions (Set matchId đã subscribe) và gọi unsubscribe từng cái.
 * Bắt buộc khi xử lý event "close" để server không giữ reference socket đã chết
 * và registry luôn đồng bộ với client còn sống.
 */
function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

/**
 * Gửi payload dạng JSON qua socket (envelope: object có thể có type + data).
 * Kiểm tra readyState === WebSocket.OPEN trước khi gửi — chỉ gửi khi connection
 * ở trạng thái OPEN (state machine). Gửi sai state có thể gây lỗi/crash.
 * @see docs/websocket-knowledge-summary.md — State Machine (OPEN = 1)
 */
function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

/**
 * Broadcast một message đến mọi client đang kết nối (one-to-all).
 * Chỉ gửi cho client có readyState === OPEN. Dùng cho event mang tính toàn hệ thống,
 * ví dụ match_created — mọi client đều có thể cần biết có trận mới.
 * @see docs/websocket-knowledge-summary.md — Message Routing: Broadcast
 */
function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

/**
 * Multicast: gửi message chỉ đến client đã subscribe matchId (room pattern).
 * Lấy Set subscriber từ matchSubscribers; nếu rỗng thì return. Chỉ gửi cho
 * client còn OPEN. Dùng cho commentary, score update theo từng trận — chỉ người
 * xem trận đó mới nhận.
 * @see docs/websocket-knowledge-summary.md — Message Routing: Multicast
 */
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Xử lý message từ client (sau khi nhận event "message").
 * - Parse JSON; nếu lỗi thì gửi lại envelope { type: "error", message }.
 * - Envelope pattern: message có type (và matchId khi cần) để server biết logic chạy.
 * - type "subscribe" + matchId hợp lệ: subscribe(socket vào room), lưu vào
 *   socket.subscriptions, gửi ack { type: "subscribed", matchId }.
 * - type "unsubscribe" + matchId hợp lệ: unsubscribe, xóa khỏi socket.subscriptions,
 *   gửi ack { type: "unsubscribed", matchId }.
 * Data từ ws thường là Buffer nên dùng data.toString() trước khi JSON.parse.
 * @see docs/websocket-knowledge-summary.md — Envelope pattern, Server message event
 */
function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
}

/**
 * Gắn WebSocket server vào HTTP server có sẵn (noServer: true) và xử lý upgrade.
 * Trả về các hàm broadcast để REST API (matches, commentary) gọi khi có event mới.
 *
 * Luồng:
 * 1. Tạo WebSocketServer với path "/ws", noServer: true (tự handle upgrade trên HTTP server).
 * 2. HTTP server.on("upgrade"): chỉ xử lý khi pathname === "/ws"; có thể chạy Arcjet
 *    (rate limit / security) trước khi cho upgrade; nếu từ chối thì trả 429/403 và destroy socket.
 * 3. wss.handleUpgrade + emit("connection"): hoàn tất handshake (HTTP 101), chuyển sang WebSocket tunnel.
 * 4. wss.on("connection"): khởi tạo từng socket:
 *    - Heartbeat: isAlive = true; on("pong") set lại isAlive; sau đó setInterval ping mỗi 30s,
 *      nếu isAlive vẫn false thì terminate (tránh ghost connections).
 *    - socket.subscriptions = Set() để lưu các matchId client đã subscribe.
 *    - Gửi welcome envelope.
 *    - message -> handleMessage; error -> terminate (và log); close -> cleanupSubscriptions.
 * 5. Khi wss đóng thì clear interval heartbeat.
 *
 * Return: { broadcastMatchCreated, broadcastCommentary } để app.locals gán và dùng trong route.
 * @see docs/websocket-knowledge-summary.md — Lifecycle, Heartbeat, Ghost connections, Envelope
 */
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== "/ws") {
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
          } else {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          }
          socket.destroy();
          return;
        }
      } catch (e) {
        console.error("WS upgrade protection error", e);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (socket, req) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });

    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  /** Gửi event match_created tới mọi client (broadcast). Được gọi từ POST /matches khi tạo trận mới. */
  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  /** Gửi event commentary chỉ tới client subscribe matchId (multicast). Được gọi từ POST /matches/:id/commentary. */
  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}
