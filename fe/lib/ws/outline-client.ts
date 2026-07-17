import { Client } from "@stomp/stompjs";
import type { SlideItem } from "@/lib/api/slides";
import { logSlideApi, logSlideStreamLifecycle } from "@/lib/ws/slide-debug-log";

export type OutlineEvent =
  | { type: "OUTLINE_PART_SKELETON_READY"; sessionId: string; part: import("@/lib/api/slides").OutlinePart }
  | { type: "OUTLINE_PART_READY"; sessionId: string; partId: string; slides: SlideItem[] }
  | { type: "OUTLINE_PART_FAILED"; sessionId: string; partId: string; message: string }
  | { type: "DONE"; sessionId: string; partFailures: number }
  | { type: "ERROR"; sessionId: string; message: string };

export function connectOutlineStream({
  topic,
  accessToken,
  onEvent,
  onReady,
  onClose,
}: {
  topic: string;
  accessToken: string;
  onEvent: (event: OutlineEvent) => void;
  onReady: () => void;
  onClose: () => void;
}): { disconnect: () => void } {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
  const brokerURL = `${wsBase}/ws`;
  logSlideStreamLifecycle("outline connecting", { brokerURL, topic });

  const client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      logSlideStreamLifecycle("outline connected, subscribing", { topic });
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body) as OutlineEvent;
          logSlideApi("outline event", payload);
          onEvent(payload);
          if (payload.type === "DONE" || payload.type === "ERROR") {
            logSlideStreamLifecycle("outline stream finished", { type: payload.type });
            onClose();
          }
        } catch (error) {
          console.error("[EDUA slide] [WS] malformed outline frame", message.body, error);
        }
      });
      onReady();
    },
    onDisconnect: () => {
      logSlideStreamLifecycle("outline disconnected", { topic });
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
      logSlideStreamLifecycle("outline disconnect requested", { topic });
      void client.deactivate();
    },
  };
}
