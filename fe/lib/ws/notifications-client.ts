import { Client } from "@stomp/stompjs";
import { BACKEND_WS_URL } from "@/lib/backend-url";

export type NotificationEvent = {
  id: string;
  title: string;
  content: string;
  subject: string;
  senderName: string | null;
  createdAt: string;
  targetType: string | null;
  targetUrl: string | null;
};

export function connectNotificationsStream({
  getAccessToken,
  onEvent,
}: {
  getAccessToken: () => Promise<string | null>;
  onEvent: (event: NotificationEvent) => void;
}): { disconnect: () => void } {
  const brokerURL = `${BACKEND_WS_URL}/ws`;
  let isDisconnecting = false;

  const client = new Client({
    brokerURL,
    beforeConnect: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        client.reconnectDelay = 0;
        throw new Error("Không thể làm mới phiên đăng nhập cho WebSocket.");
      }
      client.connectHeaders = { Authorization: `Bearer ${accessToken}` };
    },
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe("/user/queue/notifications", (message) => {
        try {
          onEvent(JSON.parse(message.body) as NotificationEvent);
        } catch (error) {
          console.error("[EDUA] [WS] malformed notification frame", message.body, error);
        }
      });
    },
    onStompError: (frame) => {
      // React dev mode can mount, clean up, then mount this stream again while
      // the first STOMP handshake is still in flight. Spring reports that
      // expected race as an ERROR frame with "Session closed.".
      if (isDisconnecting || frame.headers.message === "Session closed.") {
        return;
      }
      console.error("[EDUA] [WS] notifications STOMP error", frame.headers, frame.body);
    },
  });
  client.activate();
  return {
    disconnect: () => {
      isDisconnecting = true;
      void client.deactivate();
    },
  };
}
