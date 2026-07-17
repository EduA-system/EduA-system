const PREFIX = "[EDUA slide]";

/** Client diagnostics must never write lesson, outline, or AI payloads to the console. */
export function logSlideStreamLifecycle(message: string, _detail?: unknown) {
  console.log(`${PREFIX} [WS] ${message}`);
}

export function logSlideApi(message: string, _detail?: unknown) {
  console.log(`${PREFIX} [API] ${message}`);
}
