import { httpPost, httpGet } from './http'

// 发送聊天消息
export async function sendMessage(conversationId, message) {
  const resp = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      message: message
    })
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`发送失败：${resp.status} ${text}`)
  }
  return resp.json()
}

// 获取对话历史
export async function getConversation(conversationId) {
  return httpGet(`/chat/${conversationId}`)
}

// 删除对话
export async function deleteConversation(conversationId) {
  const resp = await fetch(`/api/v1/chat/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE'
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`删除失败：${resp.status} ${text}`)
  }
  return resp.json()
}
