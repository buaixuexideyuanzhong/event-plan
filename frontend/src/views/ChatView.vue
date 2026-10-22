<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { sendMessage, getConversation } from '../api/chat'
import { renderPlan } from '../utils/markdown'
import { exportToPDF, exportToWord, exportToMarkdown } from '../utils/export'

const router = useRouter()
const route = useRoute()

const conversationId = ref(route.query.conv_id || null)
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const currentPlan = ref(null)
const exporting = ref(false)
const messagesContainer = ref(null)

async function loadConversation() {
  if (!conversationId.value) return
  try {
    const conv = await getConversation(conversationId.value)
    messages.value = conv.messages || []
    currentPlan.value = conv.current_plan
  } catch (e) {
    console.error('加载对话失败:', e)
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  
  loading.value = true
  inputText.value = ''
  
  try {
    const result = await sendMessage(conversationId.value, text)
    conversationId.value = result.conversation_id
    messages.value.push({
      role: 'user',
      content: text,
      timestamp: Date.now() / 1000
    })
    messages.value.push({
      role: 'assistant',
      content: result.message.content,
      timestamp: Date.now() / 1000
    })
    if (result.plan_updated) {
      currentPlan.value = { plan: result.message.content }
    }
    await nextTick()
    scrollToBottom()
  } catch (e) {
    alert(`发送失败：${e.message}`)
  } finally {
    loading.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleExportPDF() {
  if (!currentPlan.value?.plan) return
  exporting.value = true
  try {
    const html = renderPlan(currentPlan.value.plan)
    await exportToPDF(html, '活动策划方案')
  } catch (e) {
    alert(`导出失败：${e.message}`)
  } finally {
    exporting.value = false
  }
}

async function handleExportWord() {
  if (!currentPlan.value?.plan) return
  exporting.value = true
  try {
    const html = renderPlan(currentPlan.value.plan)
    await exportToWord(html, '活动策划方案')
  } catch (e) {
    alert(`导出失败：${e.message}`)
  } finally {
    exporting.value = false
  }
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  loadConversation()
})
</script>

<template>
  <div class="chat-view">
    <header class="chat-header">
      <button class="btn-back" @click="goHome">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>返回</span>
      </button>
      <h1>多轮对话</h1>
      <div class="header-actions" v-if="currentPlan?.plan">
        <button class="btn-export" :disabled="exporting" @click="handleExportPDF">
          {{ exporting ? '导出中...' : ' PDF' }}
        </button>
        <button class="btn-export" :disabled="exporting" @click="handleExportWord">
          {{ exporting ? '导出中...' : '📝 Word' }}
        </button>
      </div>
    </header>

    <main class="chat-main">
      <div ref="messagesContainer" class="messages-container">
        <div v-if="messages.length === 0" class="welcome">
          <h2>开始对话</h2>
          <p>输入活动需求，我会帮你生成策划方案</p>
          <p class="hint">生成后可以继续对话修改方案</p>
        </div>
        
        <div v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div v-if="msg.role === 'assistant'" class="message-md" v-html="renderPlan(msg.content)"></div>
            <div v-else class="message-text">{{ msg.content }}</div>
          </div>
        </div>
        
        <div v-if="loading" class="message assistant">
          <div class="message-avatar"></div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <textarea
          v-model="inputText"
          placeholder="输入需求或修改指令，例如：把场地换成户外的、预算降低 20%..."
          :disabled="loading"
          @keydown.enter.exact.prevent="handleSend"
          rows="3"
        ></textarea>
        <button class="btn-send" :disabled="!inputText.trim() || loading" @click="handleSend">
          {{ loading ? '发送中...' : '发送' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.chat-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f1f5f9;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-export {
  padding: 8px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #3b82f6;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.welcome h2 {
  font-size: 24px;
  color: #0f172a;
  margin-bottom: 12px;
}

.welcome .hint {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 8px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
}

.message.user .message-content {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.message-text {
  line-height: 1.6;
}

.message-md {
  line-height: 1.7;
  color: #1e293b;
}

.message-md :deep(h1), .message-md :deep(h2), .message-md :deep(h3) {
  margin-top: 12px;
  margin-bottom: 8px;
}

.message-md :deep(p) {
  margin-bottom: 8px;
}

.message-md :deep(ul), .message-md :deep(ol) {
  padding-left: 20px;
  margin-bottom: 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-area {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-area textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
}

.input-area textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.input-area textarea:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}

.btn-send {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-send:hover:not(:disabled) {
  background: #2563eb;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
