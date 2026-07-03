const PREFIX = "[EDUA slide]";

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
