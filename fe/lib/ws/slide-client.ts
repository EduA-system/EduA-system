import { Client } from "@stomp/stompjs";
import type { BeSlideBackground, BeSlideElement } from "@/components/slide-editor/lib/be-mapper";
import { logSlideEvent, logSlideStreamLifecycle } from "@/lib/ws/slide-debug-log";

export type SlideEvent =
  | {
      type: "SLIDE_PART_READY";
      sessionId: string;
      partId: string;
      elements: BeSlideElement[];
      background: BeSlideBackground | null;
    }
  | { type: "SLIDE_PART_FAILED"; sessionId: string; partId: string; message: string }
  | {
      type: "LOG";
      sessionId: string;
      level: string;
      source: string;
      message: string;
      partId: string | null;
    }
  | { type: "DONE"; sessionId: string; partFailures: number; deckId: string | null }
  | { type: "ERROR"; sessionId: string; message: string };

export function connectSlideStream({
  topic,
  onEvent,
  onClose,
}: {
  topic: string;
  onEvent: (event: SlideEvent) => void;
  onClose: () => void;
}): { disconnect: () => void } {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
  const brokerURL = `${wsBase}/ws`;
  logSlideStreamLifecycle("connecting", { brokerURL, topic });

  const client = new Client({
    brokerURL,
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      logSlideStreamLifecycle("connected, subscribing", { topic });
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body) as SlideEvent;
          logSlideEvent(payload, { topic });
          onEvent(payload);
          if (payload.type === "DONE" || payload.type === "ERROR") {
            logSlideStreamLifecycle("stream finished", { type: payload.type });
            onClose();
          }
        } catch (error) {
          console.error("[EDUA slide] [WS] malformed frame", message.body, error);
        }
      });
    },
    onDisconnect: () => {
      logSlideStreamLifecycle("disconnected", { topic });
      onClose();
    },
    onStompError: (frame) => {
      console.error("[EDUA slide] [WS] STOMP error", frame.headers, frame.body);
      onClose();
    },
    onWebSocketClose: (event) => {
      logSlideStreamLifecycle("websocket closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    },
  });
  client.activate();
  return {
    disconnect: () => {
      logSlideStreamLifecycle("disconnect requested", { topic });
      void client.deactivate();
    },
  };
}
