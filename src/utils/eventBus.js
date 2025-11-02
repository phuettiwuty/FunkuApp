// src/utils/eventBus.js
const listeners = {};

export const on = (event, cb) => {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(cb);
  return () => listeners[event]?.delete(cb);
};

export const emit = (event, payload) => {
  if (!listeners[event]) return;
  for (const cb of Array.from(listeners[event])) {
    try { cb(payload); } catch {}
  }
};
