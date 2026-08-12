import { Client } from "@stomp/stompjs";
import type { SlideItem } from "@/lib/api/slides";
import { BACKEND_WS_URL } from "@/lib/backend-url";
import { logSlideApi, logSlideStreamLifecycle } from "@/lib/ws/slide-debug-log";

export type OutlineEvent =
  | { type: "OUTLINE_PART_SKELETON_READY"; sessionId: string; part: import("@/lib/api/slides").OutlinePart }
  | { type: "OUTLINE_PART_READY"; sessionId: string; partId: string; slides: SlideItem[] }
  | { type: "OUTLINE_PART_FAILED"; sessionId: string; partId: string; message: string }
  | { type: "OUTLINE_SLIDE_READY"; sessionId: string; partId: string; slide: SlideItem }
  | { type: "OUTLINE_SLIDE_FAILED"; sessionId: string; partId: string; slideId: string; message: string }
  | { type: "DONE"; sessionId: string; partFailures: number }
  | { type: "ERROR"; sessionId: string; message: string };

export function connectOutlineStream({
  topic,
  getAccessToken,
  onEvent,
  onReady,
  onClose,
}: {
  topic: string;
  getAccessToken: () => Promise<string | null>;
  onEvent: (event: OutlineEvent) => void;
  onReady: () => void;
  onClose: () => void;
}): { disconnect: () => void } {
  const brokerURL = `${BACKEND_WS_URL}/ws`;
  logSlideStreamLifecycle("outline connecting");

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
      logSlideStreamLifecycle("outline connected, subscribing");
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body) as OutlineEvent;
          logSlideApi(`outline event: ${payload.type}`);
          onEvent(payload);
          if (payload.type === "DONE" || payload.type === "ERROR") {
            logSlideStreamLifecycle(`outline stream finished: ${payload.type}`);
            onClose();
          }
        } catch (error) {
          console.error("[EDUA slide] [WS] malformed outline frame", message.body, error);
        }
      });
      onReady();
    },
    onDisconnect: () => {
      logSlideStreamLifecycle("outline disconnected");
      onClose();
    },
    onStompError: (frame) => {
      console.error("[EDUA slide] [WS] outline STOMP error", frame.headers, frame.body);
      onClose();
    },
  });
  client.activate();
  return {
    disconnect: () => {
      logSlideStreamLifecycle("outline disconnect requested");
      void client.deactivate();
    },
  };
}
