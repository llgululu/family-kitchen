/**
 * WebSocket 客户端封装
 * - 基于 uni.connectSocket，兼容小程序和 H5
 * - 通过 query 参数传递 JWT token
 * - 自动重连（最多 3 次，带随机抖动）
 * - 单例模式，防止重复连接
 * - 统一事件分发，不累积 listener
 */

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function buildWsUrl() {
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.port = String(parseInt(url.port || '3000') + 1);
    url.pathname = '';
    return url.origin;
  } catch {
    return 'ws://localhost:3001';
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY = 3000;

/** @type {ReturnType<typeof uni.connectSocket> | null} */
let socketTask = null;
let retries = 0;
let manuallyClosed = false;
let reconnectTimer = null;

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (manuallyClosed || retries >= MAX_RETRIES) return;
  retries++;
  // Jitter: 3s ± 1s to avoid thundering herd
  const delay = BASE_DELAY + Math.floor(Math.random() * 2000) - 1000;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, delay);
}

/**
 * Internal: create the socket and wire up events once.
 */
function doConnect() {
  const token = uni.getStorageSync('token') || '';
  if (!token) return;

  // Guard: if there's already an active connection, skip
  if (socketTask) return;

  const wsUrl = `${buildWsUrl()}?token=${encodeURIComponent(token)}`;

  socketTask = uni.connectSocket({ url: wsUrl, complete: () => {} });

  socketTask.onOpen(() => {
    retries = 0;
  });

  socketTask.onMessage((res) => {
    try {
      const msg = JSON.parse(res.data);
      if (msg.event) {
        const cbs = listeners.get(msg.event);
        if (cbs) {
          for (const cb of cbs) cb(msg.data);
        }
      }
    } catch {
      // ignore non-JSON / heartbeat frames
    }
  });

  socketTask.onClose(() => {
    socketTask = null;
    scheduleReconnect();
  });

  socketTask.onError(() => {
    // uni.connectSocket already fires onClose after onError, so just null the ref
    socketTask = null;
  });
}

/**
 * 建立 WebSocket 连接（单例）。
 * 如果已有活跃连接则复用。
 */
export function connect() {
  manuallyClosed = false;
  clearReconnectTimer();
  doConnect();
}

/**
 * 订阅指定事件。
 * @param {string} event
 * @param {Function} cb
 */
export function on(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
}

/**
 * 取消订阅指定事件。
 * @param {string} event
 * @param {Function} cb
 */
export function off(event, cb) {
  listeners.get(event)?.delete(cb);
}

/**
 * 关闭 WebSocket 连接，取消待执行的重连。
 */
export function close() {
  manuallyClosed = true;
  retries = MAX_RETRIES;
  clearReconnectTimer();
  listeners.clear();
  if (socketTask) {
    socketTask.close({});
    socketTask = null;
  }
}
