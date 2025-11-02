// src/utils/eventBus.js
const listeners = {};
export function on(event, handler) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(handler);
  return () => listeners[event]?.delete(handler);
}
export function emit(event, payload) {
  listeners[event]?.forEach(h => { try { h(payload); } catch (e) {} });
}
