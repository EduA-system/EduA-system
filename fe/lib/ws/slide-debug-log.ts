import type { SlideEvent } from "@/lib/ws/slide-client";

const PREFIX = "[EDUA slide]";

function consoleByLevel(level: string, ...args: unknown[]) {
  switch (level) {
    case "error":
      console.error(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    default:
      console.log(...args);
  }
}

export function logSlideEvent(event: SlideEvent, meta?: { topic?: string }) {
  const topic = meta?.topic;
  const topicSuffix = topic ? ` topic=${topic}` : "";

  switch (event.type) {
    case "LOG":
      consoleByLevel(
        event.level,
        `${PREFIX} [AI]${topicSuffix}`,
        event.partId ? `slide=${event.partId}` : null,
        `${event.source}: ${event.message}`,
        event,
      );
      break;
    case "SLIDE_PART_READY":
      console.log(
        `${PREFIX} ✓ SLIDE_PART_READY${topicSuffix}`,
        `slide=${event.partId}`,
        `elements=${event.elements.length}`,
        event,
      );
      break;
    case "SLIDE_PART_FAILED":
      console.error(
        `${PREFIX} ✗ SLIDE_PART_FAILED${topicSuffix}`,
        `slide=${event.partId}`,
        event.message,
        event,
      );
      break;
    case "DONE":
      console.log(
        `${PREFIX} DONE${topicSuffix}`,
        `partFailures=${event.partFailures}`,
        `deckId=${event.deckId ?? "null"}`,
        event,
      );
      break;
    case "ERROR":
      console.error(`${PREFIX} ERROR${topicSuffix}`, event.message, event);
      break;
    default: {
      const unknown = event as { type?: string };
      console.log(`${PREFIX} ? ${unknown.type ?? "unknown"}${topicSuffix}`, event);
    }
  }
}

export function logSlideStreamLifecycle(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(`${PREFIX} [WS] ${message}`, detail);
  } else {
    console.log(`${PREFIX} [WS] ${message}`);
  }
}

export function logSlideApi(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(`${PREFIX} [API] ${message}`, detail);
  } else {
    console.log(`${PREFIX} [API] ${message}`);
  }
}
