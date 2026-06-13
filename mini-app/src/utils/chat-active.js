/**
 * 跟踪当前打开的聊天页 orderId。
 * 由 chat.vue 进入/离开时设置/清除，供 App.vue 全局消息通知判断。
 */
let activeChatOrderId = null;

export function setActiveChatOrderId(id) {
  activeChatOrderId = id;
}

export function getActiveChatOrderId() {
  return activeChatOrderId;
}
