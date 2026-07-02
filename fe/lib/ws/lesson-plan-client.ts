import { Client } from "@stomp/stompjs";
import type { Activity5512 } from "@/data/lessonPlan5512Mock";
import type { GeneratedLessonPlan } from "@/services/lessonPlanService";

// Sự kiện streaming sinh giáo án 5512, khớp `LessonPlanEvent` ở BE
// (sealed interface, discriminator field `type`). Topic: /topic/lesson-plan/{sessionId}.
export type LessonPlanEvent =
  | { type: "FRAME_READY"; sessionId: string; frame: GeneratedLessonPlan }
  | { type: "ACTIVITY_READY"; sessionId: string; activityId: string; activity: Activity5512 }
  | { type: "ACTIVITY_FAILED"; sessionId: string; activityId: string; reasons: string[] }
  | { type: "DONE"; sessionId: string; lessonPlanId: string | null }
  | { type: "ERROR"; sessionId: string; message: string };

/**
 * Mở STOMP subscription cho một phiên sinh giáo án. Nối thẳng `ws://localhost:8080/ws`
 * (KHÔNG qua proxy Next.js — né timeout). Tự `onClose` khi nhận DONE/ERROR.
 */
export function connectLessonPlanStream({
  topic,
  onEvent,
  onClose,
}: {
  topic: string;
  onEvent: (event: LessonPlanEvent) => void;
  onClose: () => void;
}): { disconnect: () => void } {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
  const brokerURL = `${wsBase}/ws`;
  console.log("[lesson-plan WS] connecting", { brokerURL, topic });

  const client = new Client({
    brokerURL,
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      console.log("[lesson-plan WS] connected, subscribing", { topic });
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body) as LessonPlanEvent;
          onEvent(payload);
          if (payload.type === "DONE" || payload.type === "ERROR") {
            console.log("[lesson-plan WS] stream finished", { type: payload.type });
            onClose();
          }
        } catch (error) {
          console.error("[lesson-plan WS] malformed frame", message.body, error);
        }
      });
    },
    onDisconnect: () => {
      console.log("[lesson-plan WS] disconnected", { topic });
      onClose();
    },
    onStompError: (frame) => {
      console.error("[lesson-plan WS] STOMP error", frame.headers, frame.body);
      onClose();
    },
    onWebSocketClose: (event) => {
      console.log("[lesson-plan WS] websocket closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    },
  });
  client.activate();
  return {
    disconnect: () => {
      console.log("[lesson-plan WS] disconnect requested", { topic });
      void client.deactivate();
    },
  };
}

/** Topic STOMP cho một phiên giáo án. */
export function lessonPlanTopic(sessionId: string): string {
  return `/topic/lesson-plan/${sessionId}`;
}
