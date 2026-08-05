import { Client } from "@stomp/stompjs";

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
  accessToken,
  onEvent,
}: {
  accessToken: string;
  onEvent: (event: NotificationEvent) => void;
}): { disconnect: () => void } {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
  const brokerURL = `${wsBase}/ws`;

  const client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
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
      console.error("[EDUA] [WS] notifications STOMP error", frame.headers, frame.body);
    },
  });
  client.activate();
  return {
    disconnect: () => {
      void client.deactivate();
    },
  };
}
